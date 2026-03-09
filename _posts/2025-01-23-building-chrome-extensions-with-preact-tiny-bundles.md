---
layout: post
title: "Building Chrome Extensions with Preact for Tiny Bundles: Complete Guide"
description: "Learn how to build lightweight Chrome extensions using Preact for incredibly small bundle sizes. Master preact chrome extension development, preact popup creation, and lightweight extension UI optimization techniques."
date: 2025-01-23
categories: [Chrome Extensions, Framework]
tags: [chrome-extension, framework]
keywords: "preact chrome extension, lightweight extension ui, preact popup, chrome extension preact, preact chrome extension tutorial, build chrome extension with preact"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/23/building-chrome-extensions-with-preact-tiny-bundles/"
---

# Building Chrome Extensions with Preact for Tiny Bundles: Complete Guide

When it comes to building Chrome extensions, every kilobyte counts. Users expect lightning-fast load times, and Chrome's extension ecosystem rewards developers who optimize their bundles. This is where Preact shines—a lightweight alternative to React that delivers the same component-based architecture with a fraction of the footprint. In this comprehensive guide, we'll explore how to leverage Preact for Chrome extension development, creating powerful extensions with incredibly small bundle sizes that users will love.

Preact has emerged as the go-to choice for developers who want React's developer experience without the overhead. With a mere 3KB footprint compared to React's 40KB+, Preact enables developers to build feature-rich Chrome extensions that load instantly and consume minimal memory. This makes it particularly valuable for extensions where performance directly impacts user experience and reviews.

---

## Why Choose Preact for Chrome Extension Development? {#why-preact}

The decision to use Preact for your Chrome extension project isn't just about saving bytes—it's about making strategic choices that benefit both you as a developer and your users. Let's dive deep into the compelling reasons to choose Preact for your next Chrome extension.

### The Size Advantage

Preact's tiny size is its most celebrated feature, but the implications for Chrome extension development are profound. When you build a preact chrome extension, you're not just saving bandwidth—you're creating an extension that loads faster, responds quicker, and feels more responsive to users. Chrome extensions with smaller bundle sizes also tend to receive better reviews in the Chrome Web Store, as users appreciate extensions that don't bog down their browser.

The actual numbers are impressive. A typical React-based Chrome extension popup might weigh around 100KB minified and gzipped. The same extension built with Preact can easily come in under 30KB—a 70% reduction that users will notice. This size advantage becomes even more significant when you consider that many users install multiple extensions, and browser memory is a finite resource.

### React Compatibility

One of Preact's greatest strengths is its compatibility with the React ecosystem. The Preact team has invested significant effort in ensuring that most React libraries and patterns work seamlessly with Preact. This means you can leverage the vast React ecosystem while enjoying Preact's size benefits. For chrome extension preact projects, this compatibility allows you to use popular libraries like Preact Signals for state management, Preact Router for navigation in your extension's options page, and countless UI component libraries.

The compatibility layer works through Preact's `preact/compat` package, which provides aliases for React modules. When properly configured with your bundler, this allows you to import React components from npm packages designed for React and have them work transparently with Preact. This is particularly valuable when building complex extensions that might require third-party components.

### Performance Benefits

Beyond raw size, Preact offers performance optimizations that are especially valuable in the Chrome extension context. Preact's smaller DOM footprint means less memory usage, which is critical for extensions that run in the browser's UI thread. The faster initial render times of Preact mean your extension's popup or options page becomes interactive more quickly, creating a snappier user experience.

Preact also includes optimizations like async rendering and efficient diffing algorithms that contribute to better runtime performance. These optimizations matter in Chrome extensions because extensions share the browser's resources, and any performance improvement directly benefits the user's overall browsing experience.

---

## Setting Up Your Preact Chrome Extension Project {#project-setup}

Now that you understand why Preact is an excellent choice for Chrome extension development, let's set up a complete project. We'll use a modern build toolchain that handles the unique requirements of Chrome extension development while keeping our bundle sizes minimal.

### Prerequisites and Initial Configuration

Before we begin, ensure you have Node.js 18 or higher installed. We'll use Vite as our build tool, as it offers excellent support for multi-page applications and Chrome extension development. Create your project directory and initialize it:

```bash
mkdir preact-chrome-extension && cd preact-chrome-extension
npm init -y
```

Install the necessary dependencies for Preact and Chrome extension development:

```bash
npm install preact @preact/signals preact-router
npm install -D vite @preact/preset-vite chrome-extension-manifest-v3 typescript
```

### Configuring Vite for Chrome Extension

Create a `vite.config.ts` file that handles Chrome extension-specific requirements:

```typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html',
        options: 'options.html'
      }
    }
  },
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
    }
  }
});
```

### Manifest Configuration

Create your `manifest.json` for Manifest V3:

```json
{
  "manifest_version": 3,
  "name": "Preact Extension",
  "version": "1.0.0",
  "description": "A lightweight Chrome extension built with Preact",
  "action": {
    "default_popup": "index.html",
    "default_icon": "icon.png"
  },
  "options_page": "options.html",
  "permissions": ["storage"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

---

## Building Your Preact Popup Extension {#popup-development}

The popup is often the first interaction users have with your Chrome extension, making it crucial to get right. In this section, we'll build a performant preact popup that demonstrates best practices for component architecture and state management.

### Creating the Popup Component

Create your main popup component in `src/popup/App.tsx`:

```tsx
import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';

const countSignal = signal(0);

export function Popup() {
  const [tabCount, setTabCount] = useState(0);

  useEffect(() => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setTabCount(tabs.length);
    });
  }, []);

  const incrementCount = () => {
    countSignal.value += 1;
  };

  return (
    <div class="popup-container">
      <header>
        <h1>Preact Extension</h1>
        <span class="badge">{tabCount} tabs open</span>
      </header>
      
      <main>
        <p>Click count: {countSignal.value}</p>
        <button onClick={incrementCount}>
          Increment
        </button>
      </main>
      
      <footer>
        <a href="#">Options</a>
      </footer>
    </div>
  );
}
```

### Styling for Small Size

For your extension's styles, consider using a lightweight approach. You can use CSS modules or a utility-first framework, but for maximum size savings, raw CSS with CSS variables works beautifully:

```css
:root {
  --primary: #4a90d9;
  --bg: #ffffff;
  --text: #333333;
  --spacing: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  width: 320px;
  padding: var(--spacing);
}

.popup-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: var(--spacing);
}

button {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

button:hover {
  opacity: 0.9;
}
```

---

## State Management in Preact Chrome Extensions {#state-management}

Managing state effectively is crucial for any Chrome extension. Preact offers several approaches, from simple hooks to advanced reactive primitives. Let's explore the best patterns for chrome extension preact development.

### Using Preact Signals for Reactive State

Preact Signals represent a paradigm shift in how we think about state in web applications. They provide fine-grained reactivity that updates only the parts of the DOM that actually change, leading to better performance and smaller bundle sizes:

```tsx
import { signal, computed, effect } from '@preact/signals';

// Global state accessible across components
export const userSettings = signal({
  theme: 'light',
  notifications: true
});

export const extensionStats = signal({
  clicks: 0,
  lastAction: null
});

// Computed values automatically update
export const isDarkMode = computed(() => 
  userSettings.value.theme === 'dark'
);

// Effects for side effects
effect(() => {
  console.log('Stats updated:', extensionStats.value);
  
  // Persist to chrome storage
  chrome.storage.local.set({
    stats: extensionStats.value
  });
});
```

### Connecting Components to Chrome Storage

Chrome extensions need to persist data across sessions. Here's how to integrate Chrome's storage API with Preact signals:

```tsx
import { signal } from '@preact/signals';

const storageSignal = signal({});

export function useChromeStorage(key, defaultValue) {
  const data = signal(defaultValue);
  
  // Load from storage on mount
  useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key]) {
        data.value = result[key];
      }
    });
  }, []);
  
  // Save to storage when value changes
  useEffect(() => {
    chrome.storage.local.set({ [key]: data.value });
  }, [data.value]);
  
  return data;
}
```

---

## Optimizing Bundle Size for Production {#bundle-optimization}

The true power of Preact for Chrome extensions becomes apparent when you optimize for production. Here are advanced techniques to squeeze every possible byte from your extension.

### Tree Shaking and Code Splitting

Configure your build to ensure maximum tree shaking:

```typescript
// vite.config.ts - Production optimization
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          preact: ['preact', 'preact/hooks'],
          signals: ['@preact/signals']
        }
      }
    }
  }
});
```

### Lazy Loading Components

For extensions with multiple features, lazy loading can significantly reduce initial bundle size:

```tsx
import { lazy, Suspense } from 'preact/compat';

const HeavyFeature = lazy(() => import('./HeavyFeature'));

export function MainComponent() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyFeature />
    </Suspense>
  );
}
```

### Using Preact's Aliases Correctly

Ensure your bundler aliases React to Preact correctly to benefit from the entire ecosystem:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  }
});
```

---

## Building Content Scripts with Preact {#content-scripts}

Content scripts run in the context of web pages and can benefit significantly from Preact's small footprint. Let's explore how to build efficient content scripts.

### Content Script Setup

Content scripts in Manifest V3 are loaded separately from your extension's other parts, so keeping them small is crucial:

```tsx
// src/content/index.tsx
import { render } from 'preact';
import { ContentWidget } from './ContentWidget';

function init() {
  const container = document.createElement('div');
  container.id = 'preact-extension-widget';
  document.body.appendChild(container);
  
  render(<ContentWidget />, container);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### Communicating with Background Script

Content scripts can communicate with the background service worker using Chrome's message passing:

```tsx
// Sending messages from content script
chrome.runtime.sendMessage(
  { type: 'GET_DATA', url: window.location.href },
  (response) => {
    console.log('Received data:', response);
  }
);

// Receiving messages in content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_UI') {
    // Update your Preact component
    updateComponent(message.data);
  }
});
```

---

## Options Page Development {#options-page}

Chrome extensions typically include an options page for user configuration. Preact makes building a lightweight options page straightforward:

```tsx
// src/options/App.tsx
import { useState } from 'preact/hooks';

export function Options() {
  const [settings, setSettings] = useState({
    enabled: true,
    theme: 'light',
    notifications: true
  });

  const saveSettings = async () => {
    await chrome.storage.sync.set({ settings });
    alert('Settings saved!');
  };

  return (
    <div class="options-page">
      <h1>Extension Settings</h1>
      
      <label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({
            ...settings,
            enabled: e.target.checked
          })}
        />
        Enable Extension
      </label>
      
      <label>
        Theme:
        <select
          value={settings.theme}
          onChange={(e) => setSettings({
            ...settings,
            theme: e.target.value
          })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      
      <button onClick={saveSettings}>Save Settings</button>
    </div>
  );
}
```

---

## Best Practices for Preact Chrome Extensions {#best-practices}

To get the most out of Preact in your Chrome extension development, follow these proven best practices that experienced developers have refined over countless projects.

### Keep Dependencies Minimal

Every npm package you add increases your bundle size. Before installing any dependency, ask yourself if you truly need it. Preact's small standard library often means you don't need external utilities that you might reach for in React projects. For example, lodash functions can often be replaced with native JavaScript methods, saving significant bundle space.

### Use TypeScript

TypeScript adds minimal runtime overhead while providing excellent development experience. The type annotations compile away, leaving your production bundle unchanged while catching errors during development. For Preact, use `@preact/signals` types and configure your editor for JSX autocomplete.

### Test with Chrome's Performance Tools

Chrome provides excellent developer tools for profiling extension performance. Use the Performance tab to measure your extension's impact on page load times and the Memory tab to identify leaks. Regular testing ensures your extension remains fast as you add features.

### Handle Manifest V3 Service Worker Limitations

Remember that Manifest V3 service workers have limitations compared to Manifest V2 background pages. They don't persist execution time and can be terminated after 30 seconds of inactivity. Design your extension to handle these constraints gracefully, using alarms for periodic tasks and storing state in chrome.storage.

---

## Conclusion: Embrace Lightweight Extension Development

Building Chrome extensions with Preact represents a smart choice for developers who care about performance, user experience, and professional development practices. The framework's tiny footprint, React compatibility, and excellent developer experience make it an ideal choice for Chrome extension projects of any size.

By following the patterns and techniques in this guide, you can create Chrome extensions that load instantly, use minimal memory, and provide an excellent user experience. The Preact ecosystem continues to grow, with new tools and libraries making it easier than ever to build sophisticated extensions with minimal bundle sizes.

Remember that every kilobyte you save translates to a better experience for your users—and in the competitive Chrome Web Store, that edge can make the difference between a thriving extension and an abandoned one. Start building with Preact today, and join the community of developers who are redefining what Chrome extensions can be.

---

## Additional Resources

- [Preact Official Documentation](https://preactjs.com)
- [Preact Signals](https://preactjs.com/guide/v10/signals)
- [Chrome Extension Development Docs](https://developer.chrome.com/docs/extensions/mv3)
- [Vite Chrome Extension Templates](https://github.com/xiaoxian521/vite-plugin-chrome-extension)
