---
layout: default
title: "Chrome Extension Lazy Loading: Dynamic Imports and Code Splitting for Faster Startup"
description: "Master lazy loading and code splitting techniques for Chrome extensions to dramatically reduce startup time, improve perceived performance, and optimize memory usage in Manifest V3 extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-lazy-loading-code-splitting/"
proficiency_level: "Intermediate"
---

# Chrome Extension Lazy Loading: Dynamic Imports and Code Splitting for Faster Startup

Startup performance is critical for Chrome extensions. Users expect instant responses when they click your extension icon, open the options page, or interact with content scripts. A slow-loading extension creates friction, leads to negative reviews, and ultimately results in uninstalls. This comprehensive guide covers advanced lazy loading and code splitting techniques that can reduce your extension's initial bundle size by 50-80% while dramatically improving perceived and actual performance.

Modern Chrome extensions built with JavaScript frameworks often ship with bloated bundles that include the entire library code upfront, even when users only interact with a fraction of the functionality. By implementing strategic lazy loading and code splitting, you can defer loading non-critical code until it's actually needed, creating a faster, more responsive experience for your users.

---

## Why Startup Time Matters for Extensions

Chrome extensions operate under unique constraints that make startup optimization particularly important. Unlike web applications, extensions must load quickly across multiple contexts: the background service worker, popup, options page, and content scripts. Each of these contexts has different performance characteristics and user expectations.

### The Impact of Slow Startup

When your extension takes too long to initialize, users perceive it as unresponsive or broken. Research shows that users abandon applications that take more than 3 seconds to become interactive. For Chrome extensions, this threshold is even stricter because users expect the popup to open instantly when clicking the toolbar icon.

Slow startup affects multiple aspects of your extension's success. First, it damages user experience—delays create frustration and erode trust in your extension. Second, it impacts your Chrome Web Store listing—Google's algorithmic ranking considers performance metrics when surfacing extensions. Third, it increases resource consumption—loading more code than necessary wastes CPU cycles and memory, particularly problematic on lower-end devices.

### Understanding Extension Lifecycle

To optimize startup effectively, you must understand how Chrome extensions initialize. In Manifest V3, the background service worker (previously called background scripts) runs in an ephemeral environment that terminates after periods of inactivity. When the service worker wakes up to handle events, it must reinitialize completely—this is your cold start scenario.

The popup has even more stringent constraints. It runs in a limited window that closes after user interaction or a short timeout. The browser allocates minimal resources to popup execution, making it essential to minimize both bundle size and initialization logic.

Content scripts face a different challenge: they compete with the host page's scripts for parsing and execution time. Heavy content script bundles can delay page load, creating a noticeable negative impact on browsing experience.

---

## Dynamic Import() in Service Workers

The background service worker is the nerve center of your extension. It handles events, manages state, and coordinates communication between different extension contexts. Loading all your service worker code upfront wastes resources and delays response to user actions.

### Basic Dynamic Import Pattern

Dynamic `import()` allows you to load modules on demand rather than including them in your initial bundle. In the background service worker, this pattern is particularly powerful because the service worker can remain relatively lean while heavy functionality loads only when needed.

```typescript
// background/service-worker.ts

// Core handlers load immediately - these must be fast
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Heavy analytics module loads only when tracking is needed
let analyticsModule: AnalyticsModule | null = null;

interface AnalyticsModule {
  track(event: string, data: Record<string, unknown>): void;
}

async function getAnalytics(): Promise<AnalyticsModule> {
  if (!analyticsModule) {
    const module = await import('./modules/analytics.js');
    analyticsModule = await module.initialize();
  }
  return analyticsModule;
}

// Feature modules cached in memory for service worker lifetime
const moduleCache = new Map<string, unknown>();

async function importCached<T>(modulePath: string): Promise<T> {
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath) as T;
  }

  const module = await import(modulePath);
  moduleCache.set(modulePath, module);
  return module;
}

// Handler triggers lazy load on demand
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'track_event') {
    getAnalytics().then(analytics => {
      analytics.track(message.event, message.data);
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'load_feature') {
    importCached(`./features/${message.feature}.js`)
      .then(module => sendResponse({ module }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
```

This pattern ensures your service worker starts quickly while heavy modules load only when users actually need them. The in-memory cache prevents redundant imports during the same service worker session.

### Service Worker Restart Considerations

Remember that Manifest V3 service workers can terminate at any time. Your code must handle cold starts gracefully. When the service worker restarts, module cache is lost, and modules must be reimported. Design your lazy loading to handle this gracefully:

```typescript
// background/service-worker.ts

// Persist critical state to storage for recovery after restart
const STATE_KEY = 'extension_state';

interface ExtensionState {
  analyticsInitialized: boolean;
  lastSync: number;
}

async function getState(): Promise<ExtensionState> {
  const result = await chrome.storage.local.get(STATE_KEY);
  return result[STATE_KEY] || { analyticsInitialized: false, lastSync: 0 };
}

async function initializeAnalytics(): Promise<AnalyticsModule> {
  const state = await getState();

  // Quick check - if already initialized in this session, return cached
  if (state.analyticsInitialized && Date.now() - state.lastSync < 60000) {
    return import('./modules/analytics.js').then(m => m.getInstance());
  }

  // Otherwise initialize fresh
  const module = await import('./modules/analytics.js');
  const instance = await module.initialize();

  // Persist state for service worker restarts
  await chrome.storage.local.set({
    [STATE_KEY]: { analyticsInitialized: true, lastSync: Date.now() }
  });

  return instance;
}
```

---

## Lazy Content Script Modules

Content scripts run in the context of web pages, making them particularly sensitive to performance. A heavy content script slows down page load and consumes memory for every tab displaying matching URLs.

### Programmatic and Conditional Injection

The most effective lazy loading strategy for content scripts is to avoid static declarations in your manifest entirely. Instead, use programmatic injection to load content scripts only when needed:

```typescript
// background/service-worker.ts

// Inject content script only when user interacts
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script.js'],
  });
});

// Or inject based on URL conditions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('github.com')) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-github.js'],
    });
  }
});
```

### Feature-Based Lazy Loading

For content scripts that need to run on every page, split functionality into a lightweight bootstrap and on-demand feature modules:

```typescript
// content/bootstrap.ts
// Minimal bootstrap that runs immediately

// Lightweight core functionality
function initCore() {
  console.log('Core initialized');
  setupMessageListeners();
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'LOAD_FEATURE') {
      loadFeature(message.feature);
    }
  });
}

// Feature registry - maps feature names to module loaders
const features: Record<string, () => Promise<unknown>> = {
  'highlight': () => import('./features/highlighter.js'),
  'translate': () => import('./features/translator.js'),
  'analyze': () => import('./features/analyzer.js'),
};

async function loadFeature(featureName: string) {
  if (features[featureName]) {
    const module = await features[featureName]();
    await module.init();
    console.log(`Feature ${featureName} loaded`);
  }
}

// Initialize immediately
initCore();
```

This approach keeps your initial content script tiny while allowing heavy features to load on demand when users trigger them.

### User Interaction Triggered Loading

Load features only when users actually interact with them:

```typescript
// content/interactive-features.ts

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;

  if (target.matches('[data-lazy-load="analytics-dashboard"]')) {
    const { AnalyticsDashboard } = await import('./features/analytics-dashboard.js');
    new AnalyticsDashboard(target);
  }

  if (target.matches('[data-lazy-load="video-enhancer"]')) {
    const { VideoEnhancer } = await import('./features/video-enhancer.js');
    new VideoEnhancer();
  }
});
```

---

## On-Demand Popup Rendering

The Chrome extension popup has the strictest startup constraints. It runs in a limited window, often gets killed for memory management, and users expect it to open instantly. Optimize your popup by deferring non-critical code.

### Framework-Based Lazy Components

If you're using React, Vue, or Svelte for your popup, leverage framework-level lazy loading:

```typescript
// popup/App.tsx
import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

// Lazy load heavy pages - they won't load until navigated to
const Dashboard = lazy(() => import('./pages/Dashboard.js'));
const Settings = lazy(() => import('./pages/Settings.js'));
const Analytics = lazy(() => import('./pages/Analytics.js'));

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
```

### Progressive Loading Strategy

Load only essential UI first, then progressively enhance:

```typescript
// popup/main.ts

import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

// Essential components load immediately
import Header from './components/Header.js';
import LoadingSpinner from './components/LoadingSpinner.js';

// Non-essential components lazy loaded
const QuickActions = lazy(() => import('./components/QuickActions.js'));
const RecentActivity = lazy(() => import('./components/RecentActivity.js'));

function App() {
  const [showEnhanced, setShowEnhanced] = useState(false);

  // Load enhanced features after initial render
  useEffect(() => {
    requestIdleCallback(() => {
      setShowEnhanced(true);
    });
  }, []);

  return (
    <div class="popup">
      <Header />
      <QuickActions />
      {showEnhanced && (
        <Suspense fallback={null}>
          <RecentActivity />
        </Suspense>
      )}
    </div>
  );
}
```

---

## Route-Based Splitting in Options Page

Options pages often contain substantial functionality that most users rarely access. Route-based code splitting ensures users only download code for the settings sections they actually visit.

### React Router Implementation

```typescript
// options/App.tsx
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';

const General = lazy(() => import('./pages/General.js'));
const Appearance = lazy(() => import('./pages/Appearance.js'));
const Privacy = lazy(() => import('./pages/Privacy.js'));
const Advanced = lazy(() => import('./pages/Advanced.js'));
const Account = lazy(() => import('./pages/Account.js'));

function Sidebar() {
  return (
    <nav class="sidebar">
      <Link to="/">General</Link>
      <Link to="/appearance">Appearance</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/advanced">Advanced</Link>
      <Link to="/account">Account</Link>
    </nav>
  );
}

export function OptionsApp() {
  return (
    <HashRouter>
      <div class="options-layout">
        <Sidebar />
        <main>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<General />} />
              <Route path="/appearance" element={<Appearance />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/advanced" element={<Advanced />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  );
}
```

### Framework-Agnostic Router

For lighter implementations without heavy router libraries:

```typescript
// options/router.ts

type RouteConfig = {
  path: string;
  loader: () => Promise<{ default: Component }>;
};

const routes: RouteConfig[] = [
  { path: '/', loader: () => import('./pages/home.js') },
  { path: '/settings', loader: () => import('./pages/settings.js') },
  { path: '/about', loader: () => import('./pages/about.js') },
];

let currentRoute: string = '/';
let cachedComponent: Component | null = null;

export async function navigate(path: string) {
  if (path === currentRoute && cachedComponent) {
    render(cachedComponent);
    return;
  }

  const route = routes.find(r => r.path === path);
  if (!route) return;

  showLoading();

  const module = await route.loader();
  cachedComponent = module.default;
  currentRoute = path;

  render(cachedComponent);
}
```

---

## Shared Dependency Chunks

Chrome extensions have multiple entry points that often share significant code—utility functions, state management, API clients, and shared libraries. Proper chunk splitting prevents code duplication while ensuring efficient loading.

### Webpack Chunk Configuration

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 10000,
      cacheGroups: {
        // Vendor chunk for node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Chrome API wrapper - shared across all contexts
        chromeAPI: {
          test: /[\\/]node_modules[\\/]chrome-[\\/]/,
          name: 'chrome-api',
          chunks: 'all',
          priority: 20,
        },
        // Shared utilities between popup, background, and content
        shared: {
          name: 'shared',
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### Vite/Rollup Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import manifest from './manifest.json';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'chrome-api': ['chrome-types'],
          'shared-utils': [
            './src/utils/format.js',
            './src/utils/storage.js',
            './src/utils/logger.js',
          ],
          'api-client': [
            './src/api/client.js',
            './src/api/auth.js',
          ],
        },
      },
    },
  },
});
```

### Analyzing Chunk Efficiency

After building, analyze your chunk composition to identify optimization opportunities:

```bash
# Build with stats
webpack --profile --json > stats.json

# Analyze with webpack-bundle-analyzer
npx webpack-bundle-analyzer stats.json
```

Look for:
- Duplicate chunks appearing in multiple outputs
- Large shared chunks that could be further split
- Unnecessary shared code that could be inlined

---

## Preload Strategies

Preloading balances lazy loading with perceived performance. By predicting user actions and preloading likely needed modules, you can achieve lazy loading benefits without the associated delay.

### Idle-Time Preloading

```typescript
// popup/hooks/usePreload.ts
import { useEffect } from 'react';

export function usePreload(routes: string[]) {
  useEffect(() => {
    const preload = async () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          routes.forEach(route => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = route;
            document.head.appendChild(link);
          });
        });
      }
    };
    preload();
  }, [routes]);
}
```

### Predictive Preloading Based on User Behavior

```typescript
// background/predictive-loading.ts

// Track user navigation patterns
const navigationHistory: string[] = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_NAVIGATED') {
    const path = message.path;
    navigationHistory.push(path);

    // Keep last 10 navigation points
    if (navigationHistory.length > 10) {
      navigationHistory.shift();
    }

    // Predict and preload next likely page
    predictAndPreload();
  }
});

function predictAndPreload() {
  // Simple prediction: preload most frequently visited route
  const frequency: Record<string, number> = {};
  navigationHistory.forEach(path => {
    frequency[path] = (frequency[path] || 0) + 1;
  });

  const mostLikely = Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  if (mostLikely) {
    // Preload in background
    import(`./pages/${mostLikely}.js`).catch(() => {});
  }
}
```

---

## Measuring Startup Impact

Optimization without measurement is guesswork. Implement proper metrics to understand the real impact of your lazy loading strategies.

### Service Worker Performance Tracking

```typescript
// background/performance.ts

const perfMarks: Record<string, number> = {};

export function mark(key: string) {
  perfMarks[key] = performance.now();
}

export function measure(key: string): number {
  return performance.now() - perfMarks[key];
}

export async function loadModuleWithTracking<T>(
  name: string,
  loader: () => Promise<T>
): Promise<T> {
  mark(`module-${name}-start`);
  const module = await loader();
  const duration = measure(`module-${name}-start`);

  console.log(`Module ${name} loaded in ${duration.toFixed(2)}ms`);

  // Report to analytics
  try {
    const analytics = await import('./modules/analytics.js');
    analytics.track('module_load', { name, duration });
  } catch {
    // Analytics not available
  }

  return module;
}
```

### Popup Time to Interactive

```typescript
// popup/main.ts

const ttiStart = performance.now();

document.addEventListener('DOMContentLoaded', () => {
  const domContentLoaded = performance.now() - ttiStart;
  console.log(`DOMContentLoaded: ${domContentLoaded.toFixed(2)}ms`);
});

window.addEventListener('load', () => {
  const load = performance.now() - ttiStart;
  console.log(`Window load: ${load.toFixed(2)}ms`);
});

// Track component mount times
export function measureMount(name: string) {
  return () => {
    const mountTime = performance.now() - ttiStart;
    console.log(`${name} mounted at ${mountTime.toFixed(2)}ms`);
  };
}
```

### Chrome Tracing for Deep Analysis

For detailed performance profiling, use Chrome's tracing infrastructure:

```typescript
// background/debug.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACE') {
    // Use chrome.debugger for tracing
    chrome.debugger.attach({ tabId: sender.tab?.id }, '1.3', () => {
      chrome.debugger.sendCommand({ tabId: sender.tab?.id }, 'Tracing.start', {
        includedCategories: ['devtools.timeline', 'v8.execute', 'blink.user_timing'],
      });
    });
  }

  if (message.type === 'STOP_TRACE') {
    chrome.debugger.sendCommand({ tabId: sender.tab?.id }, 'Tracing.end', () => {
      chrome.debugger.detach({ tabId: sender.tab?.id });
    });
  }
});
```

---

## Real Before/After Benchmarks

Understanding realistic impact helps justify the implementation effort. Here are typical results from implementing lazy loading in Chrome extensions:

### Before Optimization

| Component | Initial Bundle | Time to Interactive |
|-----------|----------------|---------------------|
| Background Service Worker | 450 KB | 180ms |
| Popup | 380 KB | 220ms |
| Content Script | 290 KB | 150ms |
| Options Page | 520 KB | 280ms |
| **Total** | **1.64 MB** | **830ms** |

### After Lazy Loading

| Component | Initial Bundle | Time to Interactive |
|-----------|----------------|---------------------|
| Background Service Worker | 85 KB (core only) | 45ms |
| Popup | 65 KB (essential UI) | 35ms |
| Content Script | 35 KB (bootstrap) | 25ms |
| Options Page | 90 KB (core + route) | 50ms |
| **Total** | **275 KB** | **155ms** |

### Key Improvements

- **83% reduction** in initial bundle size (1.64 MB → 275 KB)
- **81% faster** time to interactive (830ms → 155ms)
- **Memory reduction** of 60-70% during typical usage
- **Chrome Web Store** compliance with room to grow

Actual results vary based on your extension's complexity and which features users typically access. Extensions with heavy framework dependencies see the most dramatic improvements.

---

## Framework-Specific Patterns

Different frameworks have unique patterns and tools for implementing lazy loading. This section covers the most common frameworks used in Chrome extension development.

### React Extensions

React provides built-in support for code splitting through `React.lazy()` and `Suspense`:

```tsx
// popup/App.tsx
import { lazy, Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// Component-level lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));

// Preload strategy for likely routes
function useRoutePreloader() {
  const location = useLocation();

  useEffect(() => {
    // Preload other routes during idle time
    const routes = ['/settings', '/profile'];
    const currentRoute = location.pathname;

    requestIdleCallback(() => {
      routes
        .filter(route => route !== currentRoute)
        .forEach(route => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = `#${route}`;
          document.head.appendChild(link);
        });
    });
  }, [location]);
}

export function App() {
  useRoutePreloader();

  return (
    <HashRouter>
      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/profile">Profile</Link>
      </nav>
      <Suspense fallback={<GlobalLoading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
```

### Vue Extensions

Vue 3 uses `defineAsyncComponent` for lazy loading:

```typescript
// popup/main.ts
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';

const Dashboard = defineAsyncComponent(() => import('./pages/Dashboard.vue'));
const Settings = defineAsyncComponent(() => import('./pages/Settings.vue'));
const Analytics = defineAsyncComponent(() => import('./pages/Analytics.vue'));

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/settings', component: Settings },
    { path: '/analytics', component: Analytics },
  ],
});

createApp(App).use(router).mount('#app');
```

Vue's composition API also supports lazy loading composables:

```typescript
// popup/composables/useLazyFeature.ts
import { ref, shallowRef } from 'vue';

export function useLazyFeature(featurePath: string) {
  const component = shallowRef(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function load() {
    if (component.value) return;

    loading.value = true;
    try {
      const module = await import(/* @vite-ignore */ featurePath);
      component.value = module.default;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return { component, loading, error, load };
}
```

### Svelte Extensions

Svelte provides excellent code splitting with dynamic imports:

```svelte
<!-- popup/App.svelte -->
<script>
  import { onMount } from 'svelte';

  // Lazy load pages
  const routes = {
    '/': () => import('./pages/Dashboard.svelte'),
    '/settings': () => import('./pages/Settings.svelte'),
    '/analytics': () => import('./pages/Analytics.svelte'),
  };

  let currentPath = '/';
  let CurrentPage;
  let loading = false;

  async function loadPage(path) {
    loading = true;
    const module = await routes[path]();
    CurrentPage = module.default;
    currentPath = path;
    loading = false;
  }

  onMount(() => {
    loadPage('/');
  });
</script>

<nav>
  <a href="#/" class:active={currentPath === '/'} on:click|preventDefault={() => loadPage('/')}>Dashboard</a>
  <a href="#/settings" class:active={currentPath === '/settings'} on:click|preventDefault={() => loadPage('/settings')}>Settings</a>
</nav>

<main>
  {#if loading}
    <LoadingSpinner />
  {:else if CurrentPage}
    <svelte:component this={CurrentPage} />
  {/if}
</main>
```

Svelte's compiler-based approach means you get excellent tree-shaking and minimal bundle sizes even before lazy loading.

---

## Internal Links Summary

This guide complements other performance resources in the Chrome Extension Guide:

- **[Chrome Extension Performance Best Practices](/guides/chrome-extension-performance-best-practices/)**: Comprehensive performance guidelines covering initialization, memory management, and storage optimization
- **[Chrome Extension Bundle Size Optimization](/guides/chrome-extension-bundle-size-optimization/)**: Deep dive into tree-shaking, compression, and CI size budgets
- **[Lazy Loading Patterns](/guides/lazy-loading-patterns/)**: Additional lazy loading implementation patterns
- **[Extension Performance Optimization](/guides/extension-performance-optimization/)**: Runtime performance and profiling techniques
- **[Content Script Frameworks](/guides/content-script-frameworks/)**: Building UI in content scripts with React, Vue, Svelte, or other frameworks

---

## Conclusion

Lazy loading and code splitting are essential techniques for building fast, responsive Chrome extensions. By strategically deferring non-critical code until users actually need it, you can dramatically reduce initial bundle sizes while maintaining full functionality.

The key principles to remember are:

1. **Start with measurement**: Use the tracking techniques in this guide to understand your current performance baseline before making changes.

2. **Prioritize the critical path**: Ensure core functionality loads immediately while secondary features lazy load.

3. **Consider extension lifecycle**: Design for service worker restarts and popup closure by persisting necessary state.

4. **Test real-world scenarios**: Measure on actual devices, not just development machines—your users may have slower hardware.

5. **Balance complexity**: Lazy loading adds code complexity. Apply it where it has the most impact rather than implementing it everywhere.

Start by implementing dynamic imports in your background service worker, then progressively enhance your popup and options pages. The performance gains will be immediately noticeable to your users.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
