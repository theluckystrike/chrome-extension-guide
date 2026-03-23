---
layout: default
title: "Chrome Extension with React or Preact. How to Build Modern Extension UIs"
description: "A comprehensive guide to building Chrome extensions with React and Preact, covering popup development, options pages, content script injection, state management, and bundle optimization."
canonical_url: "https://bestchromeextensions.com/guides/react-preact-extension/"
---

Chrome Extension with React or Preact. How to Build Modern Extension UIs

Building Chrome extensions with modern UI frameworks like React and Preact has become the standard approach for creating sophisticated, maintainable extension interfaces. While traditional extensions relied on vanilla JavaScript and direct DOM manipulation, leveraging React or Preact provides component-based architecture, declarative UI patterns, and a rich ecosystem of libraries that dramatically improve developer productivity and user experience.

This guide walks you through building Chrome extension UIs with React and Preact, covering popup development, options pages, content script injection, state management patterns, and bundle size optimization strategies that keep your extension fast and efficient.

Why Use React or Preact for Extensions {#why-react-preact}

React and Preact each offer distinct advantages for extension development. React provides the largest ecosystem, extensive documentation, and smooth integration with popular tooling. Its component model maps naturally to extension UIs, where you often have distinct interfaces for popup, options, and side panel contexts. The virtual DOM ensures efficient updates, which is particularly valuable in extension contexts where resources are more constrained than in regular web applications.

Preact presents a compelling alternative when bundle size is critical. At just 3KB, Preact offers React-compatible APIs with a fraction of the overhead. For extensions where every kilobyte matters, particularly for content script injection across numerous pages, Preact's minimal footprint can mean the difference between a snappy user experience and one that feels sluggish. Preact's compatibility layer allows you to use most React packages with minimal configuration.

Both frameworks benefit from strong TypeScript support, enabling type-safe extension development that catches errors before runtime. The choice between them often comes down to your specific requirements: choose React for maximum ecosystem access and team familiarity, choose Preact when minimizing bundle size is paramount.

Setting Up Your Project {#setting-up-project}

Begin with a project structure that separates different extension contexts while enabling code sharing:

```
src/
 popup/
    popup.tsx          # Popup entry point
    PopupApp.tsx       # Main popup component
    components/       # Popup-specific components
 options/
    options.tsx        # Options page entry
    OptionsApp.tsx    # Main options component
    components/       # Options-specific components
 content/
    content.tsx       # Content script entry
    ContentApp.tsx    # Injected UI component
    components/       # Shared content components
 shared/                # Components and utilities shared across contexts
    components/        # Reusable UI components
    hooks/            # Custom hooks
    store/            # State management
    utils/            # Utility functions
 background/
     service-worker.ts  # Background service worker
```

Configure your build tool to handle multiple entry points. Using Vite with the CRXJS plugin, your configuration would specify each HTML entry:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from 'vite-plugin-chrome-extension';
import { manifest } from './manifest.json';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html',
        content: 'src/content/content.html'
      }
    }
  },
  plugins: [react(), crx({ manifest })]
});
```

Building the Popup with React {#building-popup}

The extension popup is often the primary interaction point for users, making its design and performance critical. React's component model excels here, allowing you to build complex, interactive interfaces that remain maintainable.

Create your popup entry point with explicit dimensions in the HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Popup</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./popup.tsx"></script>
</body>
</html>
```

Set appropriate dimensions in your manifest:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png", "48": "icon48.png" }
  }
}
```

Popups have a default size but can be styled to fit your content. Use CSS to set minimum and maximum dimensions:

```css
#root {
  min-width: 300px;
  max-width: 600px;
  min-height: 400px;
}
```

Implement your popup with React components that communicate with the background script:

```tsx
import { useState, useEffect } from 'react';
import { PopupHeader } from './components/PopupHeader';
import { PopupContent } from './components/PopupContent';
import { PopupFooter } from './components/PopupFooter';
import { useExtensionStore } from '../shared/store/extensionStore';

export function PopupApp() {
  const { settings, loadSettings } = useExtensionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings().finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="popup-container">
      <PopupHeader />
      <PopupContent settings={settings} />
      <PopupFooter />
    </div>
  );
}
```

Creating the Options Page {#options-page}

The options page serves as your extension's settings hub, typically requiring more screen real estate and more complex configuration interfaces than the popup. React's form handling capabilities shine here, especially when combined with state management libraries.

Structure your options page with routing for different settings categories:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GeneralSettings } from './pages/GeneralSettings';
import { AppearanceSettings } from './pages/AppearanceSettings';
import { AdvancedSettings } from './pages/AdvancedSettings';

export function OptionsApp() {
  return (
    <HashRouter>
      <div className="options-layout">
        <nav className="options-nav">
          <NavLink to="/">General</NavLink>
          <NavLink to="/appearance">Appearance</NavLink>
          <NavLink to="/advanced">Advanced</NavLink>
        </nav>
        <main className="options-content">
          <Routes>
            <Route path="/" element={<GeneralSettings />} />
            <Route path="/appearance" element={<AppearanceSettings />} />
            <Route path="/advanced" element={<AdvancedSettings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
```

Use controlled components for form inputs, persisting changes to chrome.storage:

```tsx
export function GeneralSettings() {
  const { settings, updateSettings } = useExtensionStore();

  const handleToggle = (key: keyof Settings) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="settings-section">
      <h2>General Settings</h2>
      <Toggle
        label="Enable notifications"
        checked={settings.notificationsEnabled}
        onChange={() => handleToggle('notificationsEnabled')}
      />
      <Toggle
        label="Auto-start on browser launch"
        checked={settings.autoStart}
        onChange={() => handleToggle('autoStart')}
      />
    </div>
  );
}
```

Content Script UI Injection {#content-script-injection}

Injecting React components into web pages requires careful consideration of style isolation and DOM interaction. The Shadow DOM provides essential encapsulation, preventing your extension's styles from bleeding into the host page and vice versa.

Create a content script that injects a React root into the page:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContentWidget } from './components/ContentWidget';

function initWidget() {
  // Prevent multiple injections
  if (document.getElementById('extension-widget-root')) {
    return;
  }

  // Create container in page DOM
  const container = document.createElement('div');
  container.id = 'extension-widget-root';
  document.body.appendChild(container);

  // Attach shadow DOM for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create React root inside shadow DOM
  const reactRoot = document.createElement('div');
  shadowRoot.appendChild(reactRoot);

  // Add styles to shadow DOM
  const styles = document.createElement('style');
  styles.textContent = `
    .widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
    }
  `;
  shadowRoot.appendChild(styles);

  // Render React app
  const root = createRoot(reactRoot);
  root.render(<ContentWidget />);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
```

Configure the content script in your manifest:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Handle edge cases like SPA navigation where content may need reinitialization:

```tsx
let currentUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    initWidget();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```

State Management Patterns {#state-management}

Managing state across extension contexts requires understanding Chrome's storage APIs and message passing system. Several patterns work well depending on your complexity needs.

For simple extensions, use Chrome's storage API directly with custom hooks:

```tsx
import { useState, useEffect, useCallback } from 'react';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(key).then((result) => {
      setValue(result[key] ?? initialValue);
      setIsLoaded(true);
    });
  }, [key]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as Function)(value) 
      : newValue;
    setValue(resolvedValue);
    chrome.storage.local.set({ [key]: resolvedValue });
  }, [key, value]);

  return [value, updateValue, isLoaded] as const;
}
```

For more complex state needs, Zustand provides an excellent balance of simplicity and functionality:

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExtensionState {
  settings: ExtensionSettings;
  user: UserData | null;
  updateSettings: (settings: Partial<ExtensionSettings>) => void;
  setUser: (user: UserData | null) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      user: null,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      setUser: (user) => set({ user })
    }),
    {
      name: 'extension-storage',
      storage: createJSONStorage(() => chrome.storage.local)
    }
  )
);
```

When state must sync between contexts, use message passing:

```tsx
// In popup/options
const syncState = async () => {
  const state = useExtensionStore.getState();
  await chrome.runtime.sendMessage({
    type: 'STATE_UPDATE',
    payload: state
  });
};

// In background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_UPDATE') {
    // Broadcast to all contexts
    chrome.runtime.sendMessage(message);
  }
});
```

Bundle Size Optimization {#bundle-optimization}

Extension bundle size directly impacts load times and user perception of performance. Chrome extensions have a 128KB limit for each JavaScript file in MV3, making optimization essential for larger applications.

Start with tree-shaking and code splitting:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['./src/shared/components']
        }
      }
    }
  }
});
```

Use dynamic imports for features that aren't immediately needed:

```tsx
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsPanel />
    </Suspense>
  );
}
```

For Preact, enable compat mode to use React ecosystem packages while maintaining the smaller bundle:

```typescript
import { configure } from 'preact/compat';

// Configure preact/compat at app entry
configure();
```

Implement lazy loading for extension pages:

```typescript
// popup.tsx - only load popup code
import('./popup');
```

Use platform-specific imports to exclude unnecessary code:

```typescript
// Only import what's needed
import { Storage } from 'webextension-polyfill';
// Instead of import * from 'webextension-polyfill'
```

Analyze your bundle with tools like source-map-explorer to identify optimization opportunities:

```bash
npm install source-map-explorer -D
npx source-map-explorer dist/*.js
```

Remove unused dependencies and consider lighter alternatives. For example, replace moment.js with date-fns or dayjs, or use native browser APIs where possible.

Related Guides {#related-guides}

- [Chrome Extension React Setup](./chrome-extension-react-setup.md). Detailed React setup for extensions
- [Building with React](../patterns/building-with-react.md). React patterns specific to extensions
- [Content Script React](../patterns/content-script-react.md). React in content script contexts
- [Vite Extension Setup](./vite-extension-setup.md). Build tool configuration
- [Bundle Optimization](../patterns/bundle-optimization.md). Advanced optimization techniques

Related Articles


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
