---
layout: post
title: "Building Chrome Extensions with React — Complete Developer Guide (2025)"
description: "Step-by-step guide to building Chrome extensions with React in 2025. Learn project setup, popup UI creation, content scripts with React, state management, hot reload configuration, and production build optimization."
date: 2025-02-01
categories: [Chrome Extensions, Tutorials]
tags: [react, chrome-extension, react-chrome-extension, popup-ui, content-scripts]
keywords: "chrome extension react, build react chrome extension, react chrome extension tutorial, react extension popup, chrome extension with react, manifest v3 react"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/02/01/building-chrome-extensions-with-react-complete-guide/"
---

# Building Chrome Extensions with React — Complete Developer Guide (2025)

React has become the go-to framework for building modern Chrome extensions. Its component-based architecture, efficient rendering, and vast ecosystem make it an ideal choice for creating polished, maintainable extension UIs. This guide walks you through building production-ready Chrome extensions with React in 2025, from project scaffolding to publishing.

---

## Why Use React for Chrome Extensions {#why-react}

Building Chrome extensions with vanilla JavaScript works, but React transforms the development experience in several critical ways.

### Component-Based Architecture

React's component model maps perfectly to extension development. Your popup, options page, and content script UI can all be built from reusable components. This consistency means developers can work across different parts of the extension without learning different patterns.

```jsx
// A simple React component for your popup
function SettingsPanel({ settings, onUpdate }) {
  return (
    <div className="settings-panel">
      <h2>Extension Settings</h2>
      <Toggle
        label="Enable notifications"
        checked={settings.notifications}
        onChange={(value) => onUpdate({ notifications: value })}
      />
      <Select
        label="Theme"
        options={['light', 'dark', 'system']}
        value={settings.theme}
        onChange={(value) => onUpdate({ theme: value })}
      />
    </div>
  );
}
```

### State Management

React's state management patterns (useState, useReducer, Context) solve real problems in extensions. Between service worker restarts and communication across isolated contexts, having predictable state handling is invaluable.

### Rich Ecosystem

Need a date picker? A form library? Data visualization? The React ecosystem has battle-tested solutions for everything. Extensions like [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) leverage React to deliver complex feature sets with polished UIs.

### Developer Experience

Hot module replacement, TypeScript support, and modern tooling make development enjoyable. You get immediate feedback as you build, without constantly reloading your extension in Chrome.

---

## Project Scaffolding: Vite + React + CRXJS {#project-scaffolding}

The fastest way to start is with a modern build toolchain. We'll use Vite for development, React for UI, and CRXJS for Chrome-specific builds.

### Quick Start with the Starter Kit

For a production-ready foundation, use the [chrome-extension-react-starter](https://github.com/theluckystrike/chrome-extension-react-starter) repository. It includes:

- Vite + React 18 with TypeScript
- CRXJS for Chrome extension builds
- Hot module reload configured
- Proper manifest handling
- Popup and options page templates

```bash
# Clone the starter
git clone https://github.com/theluckystrike/chrome-extension-react-starter.git my-extension
cd my-extension

# Install dependencies
npm install

# Start development
npm run dev
```

### Manual Setup

To understand the full setup, let's build it ourselves.

First, create the project and install dependencies:

```bash
npm create vite@latest my-extension -- --template react-ts
cd my-extension
npm install
npm install -D @crxjs/vite-plugin chrome-extension-manifest-v3
```

Configure Vite for Chrome extension development:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
```

Set up your Manifest V3 configuration:

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "My React Extension",
  "version": "1.0.0",
  "description": "A Chrome extension built with React",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
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

Update your entry point:

```tsx
// main.tsx - Entry point for popup
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Run `npm run dev`, open Chrome at `chrome://extensions/`, enable Developer Mode, click "Load unpacked", and select your `dist` folder. Your React extension is now running.

---

## Popup Component Architecture {#popup-architecture}

The popup is your extension's command center. With React, you can build sophisticated interfaces that rival native applications.

### Basic Popup Structure

```tsx
// App.tsx
import { useState, useEffect } from 'react';
import { useStorage } from './hooks/useStorage';
import SettingsPanel from './components/SettingsPanel';
import StatusCard from './components/StatusCard';

export default function App() {
  const [settings, setSettings] = useStorage('settings', {
    theme: 'light',
    notifications: true,
    autoSuspend: false
  });

  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => setActiveTab(tab));
  }, []);

  return (
    <div className={`popup ${settings.theme}`}>
      <header>
        <h1>Extension Name</h1>
        <StatusCard tab={activeTab} />
      </header>
      <main>
        <SettingsPanel
          settings={settings}
          onUpdate={setSettings}
        />
      </main>
    </div>
  );
}
```

### Styling for Popups

Extension popups have a fixed maximum size. Style appropriately:

```css
/* index.css */
.popup {
  width: 360px;
  min-height: 400px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.popup.dark {
  background: #1a1a1a;
  color: #ffffff;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}
```

---

## Content Scripts with React {#content-scripts}

Injecting React into web pages requires a different approach than the popup. Content scripts run in an isolated world, but you can mount React components to specific DOM nodes.

### Creating a Content Script Component

```tsx
// components/PageOverlay.tsx
import { useState, useEffect } from 'react';

interface PageOverlayProps {
  pageUrl: string;
}

export function PageOverlay({ pageUrl }: PageOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="extension-overlay">
      <button onClick={() => setIsVisible(!isVisible)}>
        Toggle Extension
      </button>
      {isVisible && (
        <div className="overlay-panel">
          <h3>Page Analysis</h3>
          <p>URL: {pageUrl}</p>
        </div>
      )}
    </div>
  );
}
```

### Injecting the Component

```tsx
// content.tsx - Entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PageOverlay } from './components/PageOverlay';

function init() {
  const container = document.createElement('div');
  container.id = 'extension-root';
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <PageOverlay pageUrl={window.location.href} />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

Configure the content script in your manifest:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ]
}
```

---

## Options Page with React Router {#options-page}

For complex extensions, you need multiple configuration screens. React Router handles this elegantly.

### Setting Up React Router

```tsx
// options/App.tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import GeneralSettings from './pages/GeneralSettings';
import AdvancedSettings from './pages/AdvancedSettings';
import About from './pages/About';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GeneralSettings />} />
          <Route path="/advanced" element={<AdvancedSettings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
```

Register the options page in your manifest:

```json
{
  "options_page": "options.html"
}
```

Build options-specific entry points in your Vite config:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        options: 'options.html'
      }
    }
  }
});
```

---

## State Management with Zustand/Jotai {#state-management}

Modern state libraries simplify extension state handling. Zustand and Jotai both work well with Chrome's unique architecture.

### Zustand for Extension State

```typescript
// store/extensionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExtensionState {
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  updateSettings: (settings: Partial<ExtensionState['settings']>) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'light',
        notifications: true,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
    }),
    {
      name: 'extension-storage',
      storage: {
        getItem: async (name) => {
          const result = await chrome.storage.local.get(name);
          return result[name] ?? null;
        },
        setItem: async (name, value) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name) => {
          await chrome.storage.local.remove(name);
        },
      },
    }
  )
);
```

### Using the Store in Components

```tsx
// components/SettingsPanel.tsx
import { useExtensionStore } from '../store/extensionStore';

export function SettingsPanel() {
  const { settings, updateSettings } = useExtensionStore();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={(e) => updateSettings({ notifications: e.target.checked })}
        />
        Enable Notifications
      </label>
    </div>
  );
}
```

---

## Chrome.Storage React Hooks {#storage-hooks}

Abstracting chrome.storage into React hooks makes data persistence seamless.

```typescript
// hooks/useChromeStorage.ts
import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
      setIsLoading(false);
    });
  }, [key]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      chrome.storage.local.set({ [key]: resolved });
      return resolved;
    });
  }, [key]);

  return [value, updateValue, isLoading] as const;
}
```

Usage in components:

```tsx
const [settings, setSettings, isLoading] = useChromeStorage('settings', {
  theme: 'light'
});

if (isLoading) return <LoadingSpinner />;
```

---

## Hot Module Reload Setup {#hot-reload}

Nothing slows development like constant manual reloads. Configure HMR for instant updates.

### CRXJS HMR Configuration

The CRXJS plugin handles most of this automatically when you run `npm run dev`. However, for content scripts, you'll need manual setup:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from '@crxjs/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest: './manifest.json',
      contentScripts: {
        injectImmediately: true,
      },
      refreshOnChange: true,
    }),
  ],
});
```

### Manual Reload Handler

For the service worker, Chrome doesn't support HMR directly. Add a reload listener:

```typescript
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
});

// Manual reload trigger
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RELOAD_EXTENSION') {
    chrome.runtime.reload();
  }
});
```

---

## Production Build and CRX Packaging {#production-build}

When ready to publish, create a proper production build.

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from '@crxjs/vite-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest: './manifest.json',
      autoLaunch: false,
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});
```

### Creating the CRX Package

Run the build command:

```bash
npm run build
```

This generates a `dist` folder with your extension, ready for manual upload to the Chrome Web Store or distribution via CRX files.

For automated Chrome Web Store uploads, configure the upload process in your CI/CD pipeline using the Chrome Web Store Publish API.

---

## Publishing to Chrome Web Store {#publishing}

The final step is making your extension available to millions of Chrome users.

### Preparing for Publication

1. **Create store assets**: 1280x800 screenshots, 440x280 promotional tile
2. **Write compelling copy**: Clear name, description highlighting key features
3. **Configure pricing**: Free or one-time purchase ($0.99 - $9.99 typical)
4. **Privacy policy**: Required if you collect any user data

### Upload Process

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Create a new item and upload your ZIP file (dist folder compressed)
3. Fill in store listing details
4. Submit for review

Review times vary from 24 hours to several days. Ensure your extension follows [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/) to avoid rejection.

---

## Real-World Example: Tab Suspender Pro Architecture

Production extensions like [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) demonstrate React's power in extensions. Its architecture includes:

- React for the popup interface with real-time tab statistics
- Content scripts for page-level suspend controls
- Service worker handling background tab management
- Zustand for managing complex state across contexts
- CRXJS for reliable builds and updates

The extension demonstrates every pattern covered in this guide, from project setup to production deployment.

---

## Next Steps

Now that you have the foundation, explore these resources to deepen your knowledge:

- [Chrome Extension Manifest V3 Documentation](/chrome-extension-guide/docs/mv3/migration-guide/)
- [Extension Monetization Playbook](/chrome-extension-guide/docs/monetization/)
- [chrome-extension-react-starter](https://github.com/theluckystrike/chrome-extension-react-starter) for production-ready code
- [Performance Optimization Guide](/chrome-extension-guide/2025/01/16/chrome-extension-performance-optimization-guide/)

---

*Built by theluckystrike at [zovo.one](https://zovo.one)*
