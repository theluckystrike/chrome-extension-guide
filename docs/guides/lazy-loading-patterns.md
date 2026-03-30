---
layout: default
title: "Chrome Extension Lazy Loading Patterns. Developer Guide"
description: "Learn Chrome extension lazy loading patterns with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/lazy-loading-patterns/"
last_modified_at: 2026-01-15
---
Chrome Extension Lazy Loading Patterns

Overview {#overview}

Lazy loading is essential for Chrome extensions to minimize initial bundle size, reduce memory footprint, and improve perceived performance. This guide covers patterns for loading code on-demand across different extension contexts.

Dynamic Import in Extension Contexts {#dynamic-import-in-extension-contexts}

Dynamic `import()` works in extension contexts just like in regular web apps, but with some considerations for the extension's permission model and file organization.

Basic Dynamic Import {#basic-dynamic-import}

```ts
// background.ts - Lazy load a heavy module only when needed
async function handleAdvancedFeature() {
  const { heavyModule } = await import('./modules/heavy-module.js');
  return heavyModule.process();
}
```

Type-Safe Dynamic Imports {#type-safe-dynamic-imports}

```ts
// types.ts
export interface AnalyticsModule {
  track(event: string, data: Record<string, unknown>): void;
  init(apiKey: string): Promise<void>;
}

// background.ts
async function loadAnalytics(): Promise<AnalyticsModule> {
  const module = await import('./modules/analytics.js');
  return module;
}
```

Lazy Loading Popup and Options Page Components {#lazy-loading-popup-and-options-page-components}

Popup and options pages have limited execution time. Load only what's immediately needed.

Popup Lazy Loading {#popup-lazy-loading}

```ts
// popup/main.ts
import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard.js'));
const Settings = lazy(() => import('./components/Settings.js'));

function App() {
  const [view, setView] = useState('dashboard');

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'settings' && <Settings />}
    </Suspense>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
});
```

Options Page with Route-Based Loading {#options-page-with-route-based-loading}

```ts
// options/main.ts
import { render } from 'preact';
import { location } from 'preact-router';

const pages = {
  '/': lazy(() => import('./pages/General.js')),
  '/appearance': lazy(() => import('./pages/Appearance.js')),
  '/privacy': lazy(() => import('./pages/Privacy.js')),
  '/advanced': lazy(() => import('./pages/Advanced.js')),
};

function App() {
  return (
    <div class="options-container">
      <Sidebar />
      <main>
        <Router>
          {Object.entries(pages).map(([path, Component]) => (
            <Route path={path} component={Component} />
          ))}
        </Router>
      </main>
    </div>
  );
}
```

On-Demand Content Script Injection {#on-demand-content-script-injection}

Content scripts run in web page contexts. Load them dynamically based on user interaction or page conditions.

Programmatic Injection {#programmatic-injection}

```ts
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  // Inject only when user clicks the extension icon
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script.js'],
  });
});
```

Conditional Injection Based on URL {#conditional-injection-based-on-url}

```ts
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script-early.js"],
      "run_at": "document_start"
    }
  ],
  "permissions": ["scripting"]
}
```

```ts
// content-script-early.ts
// Light bootstrap that decides what to load
if (window.location.hostname.includes('youtube.com')) {
  import('./features/youtube-enhancer.js');
} else if (window.location.hostname.includes('github.com')) {
  import('./features/github-enhancer.js');
}
```

User-Initiated Feature Loading {#user-initiated-feature-loading}

```ts
// content-script.ts
async function loadFeature(featureName: string) {
  const features: Record<string, () => Promise<unknown>> = {
    'highlight': () => import('./features/highlighter.js'),
    'translate': () => import('./features/translator.js'),
    'analyze': () => import('./features/analyzer.js'),
  };

  if (features[featureName]) {
    const module = await features[featureName]();
    module.init();
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LOAD_FEATURE') {
    loadFeature(message.feature);
  }
});
```

Deferred Module Loading in Service Workers {#deferred-module-loading-in-service-workers}

Service workers in extensions (MV3) are ephemeral. Defer loading non-essential modules until they're actually needed.

Lazy Module Registration {#lazy-module-registration}

```ts
// background.ts

// Core handlers registered immediately
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Heavy module loaded only when required
let analyticsModule: AnalyticsModule | null = null;

async function getAnalytics(): Promise<AnalyticsModule> {
  if (!analyticsModule) {
    const module = await import('./modules/analytics.js');
    analyticsModule = await module.initialize();
  }
  return analyticsModule;
}

// Handler that triggers lazy load
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'track_event') {
    getAnalytics().then(analytics => {
      analytics.track(message.event, message.data);
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});
```

Module Cache for Service Worker Restarts {#module-cache-for-service-worker-restarts}

```ts
// background.ts
const moduleCache = new Map<string, unknown>();

async function importCached<T>(modulePath: string): Promise<T> {
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath) as T;
  }

  const module = await import(modulePath);
  moduleCache.set(modulePath, module);
  return module;
}
```

Route-Based Code Splitting with Frameworks {#route-based-code-splitting-with-frameworks}

React Router in Extension Popup {#react-router-in-extension-popup}

```ts
// popup/App.tsx
import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home.js'));
const Profile = lazy(() => import('./pages/Profile.js'));
const Settings = lazy(() => import('./pages/Settings.js'));

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
```

Preact with petite-router {#preact-with-petite-router}

```ts
// popup/main.ts
import { render } from 'preact';
import { Router, Route } from 'preact-router';
import { lazy } from 'preact/compat';

const Home = lazy(() => import('./pages/Home.js'));
const Settings = lazy(() => import('./pages/Settings.js'));

render(
  <Router>
    <Route path="/" component={Home} />
    <Route path="/settings" component={Settings} />
  </Router>,
  document.getElementById('app')!
);
```

Framework-Agnostic Code Splitting {#framework-agnostic-code-splitting}

```ts
// lib/router.ts
type RouteConfig = {
  path: string;
  loader: () => Promise<{ default: Component }>;
};

const routes: RouteConfig[] = [
  { path: '/', loader: () => import('./pages/home.js') },
  { path: '/dashboard', loader: () => import('./pages/dashboard.js') },
  { path: '/settings', loader: () => import('./pages/settings.js') },
];

export async function navigate(path: string) {
  const route = routes.find(r => r.path === path);
  if (!route) return;

  const module = await route.loader();
  const Component = module.default;
  renderComponent(Component);
}
```

Prefetching and Caching Strategies {#prefetching-and-caching-strategies}

Stale-While-Revalidate for Extension Resources {#stale-while-revalidate-for-extension-resources}

```ts
// lib/cache.ts
const cacheName = 'extension-cache-v1';
const resourceCache = new Map<string, unknown>();

export async function fetchWithCache<T>(url: string): Promise<T> {
  // Check memory cache first
  if (resourceCache.has(url)) {
    return resourceCache.get(url) as T;
  }

  // Check cache API
  const cached = await caches.match(url);
  if (cached) {
    const data = await cached.json();
    resourceCache.set(url, data);
    return data;
  }

  // Fetch and cache
  const response = await fetch(url);
  const data = await response.json();

  const cache = await caches.open(cacheName);
  await cache.put(url, new Response(JSON.stringify(data)));

  resourceCache.set(url, data);
  return data;
}
```

Service Worker Caching Strategies {#service-worker-caching-strategies}

```ts
// background.ts - Install-time caching
chrome.runtime.onInstalled.addListener(async () => {
  const cache = await caches.open('static-assets-v1');
  await cache.addAll([
    '/popup/index.html',
    '/popup/styles.css',
    '/icons/icon-16.png',
    '/icons/icon-48.png',
  ]);
});

// Runtime caching for API calls (observational only in MV3; use declarativeNetRequest for blocking/redirecting)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('api.example.com')) {
      console.log('API request detected:', details.url);
    }
  },
  { urls: ['*://api.example.com/*'] }
);
```

Preloading Critical Routes {#preloading-critical-routes}

```ts
// popup/hooks/usePreload.ts
import { useEffect } from 'react';

export function usePreload(routes: string[]) {
  useEffect(() => {
    const preload = async () => {
      for (const route of routes) {
        // Preload during idle time
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = route;
            document.head.appendChild(link);
          });
        }
      }
    };
    preload();
  }, [routes]);
}
```

Measuring Load Time Improvements {#measuring-load-time-improvements}

Performance Markers in Background Script {#performance-markers-in-background-script}

```ts
// background.ts
const perfMarks: Record<string, number> = {};

export function mark(key: string) {
  perfMarks[key] = performance.now();
}

export function measure(key: string): number {
  return performance.now() - perfMarks[key];
}

// Track module loading times
async function loadModuleWithTracking<T>(name: string, loader: () => Promise<T>): Promise<T> {
  mark(`module-${name}-start`);
  const module = await loader();
  const duration = measure(`module-${name}-start`);

  console.log(`Module ${name} loaded in ${duration.toFixed(2)}ms`);

  // Send to analytics if available
  try {
    const analytics = await import('./modules/analytics.js');
    analytics.track('module_load', { name, duration });
  } catch {}

  return module;
}
```

Popup Performance Metrics {#popup-performance-metrics}

```ts
// popup/main.ts
// Measure time to interactive
const timeToInteractive = performance.now();
console.log(`Popup TTI: ${timeToInteractive.toFixed(2)}ms`);

// Track component mount times
function measureMount(name: string) {
  return () => {
    const mountTime = performance.now() - timeToInteractive;
    console.log(`${name} mounted at ${mountTime.toFixed(2)}ms`);
  };
}

// Usage in components
function Dashboard() {
  useEffect(measureMount('Dashboard'), []);
  return <div>Dashboard Content</div>;
}
```

Chrome Tracing for Extension Analysis {#chrome-tracing-for-extension-analysis}

```ts
// background.ts - Debugging performance
import { tracing } from '@puppeteer/bundler';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACE') {
    tracing.start({
      path: 'trace.json',
      categories: ['devtools.timeline', 'v8.execute'],
    });
  }
  if (message.type === 'STOP_TRACE') {
    tracing.stop();
    sendResponse({ path: 'trace.json' });
  }
});
```

Real User Monitoring {#real-user-monitoring}

```ts
// lib/rum.ts
export function reportPerformance(data: PerformanceMetrics) {
  const payload = {
    ...data,
    timestamp: Date.now(),
    extensionVersion: chrome.runtime.getManifest().version,
  };

  // Batch and send when possible
  if (navigator.onLine) {
    fetch('https://analytics.example.com/rum', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } else {
    // Store locally for later sync
    storeLocally(payload);
  }
}

// Usage in content script
const navTiming = performance.getEntriesByType('navigation')[0];
reportPerformance({
  loadTime: navTiming.loadEventEnd - navTiming.fetchStart,
  domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
  firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
});
```

Best Practices Summary {#best-practices-summary}

1. Always lazy load non-critical modules - Any code not needed for initial render should use dynamic imports.

2. Use framework code splitting - React, Preact, and Vue all support lazy components out of the box.

3. Cache aggressively in service workers - The background script can be terminated at any time; cached modules help maintain responsiveness.

4. Measure before optimizing - Use Chrome DevTools and performance APIs to identify actual bottlenecks.

5. Consider the extension lifecycle - Service workers restart on every message; design for cold starts.

6. Bundle smart - Use webpack or Rollup with code splitting to automatically generate separate chunks.

7. Test on low-end devices - Real-world performance matters more than synthetic benchmarks.

Related Patterns {#related-patterns}

- [Background Service Worker Patterns](./background-patterns.md)
- [Content Script Isolation](./content-script-isolation.md)
- [Message Passing](./messaging.md)

Related Articles {#related-articles}

Related Articles

- [Lazy Loading Content Scripts](../patterns/lazy-loading-content-scripts.md)
- [Caching Strategies](../guides/caching-strategies.md)
-e 
---


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
