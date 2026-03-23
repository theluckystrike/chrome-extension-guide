---
layout: post
title: "Build Chrome Extensions with SolidJS: Fine-Grained Reactive UI"
description: "Learn how to build powerful Chrome extensions with SolidJS for blazing-fast reactive UI. This comprehensive tutorial covers fine-grained reactivity, state management, and creating performant popup interfaces."
date: 2025-04-04
categories: [Chrome-Extensions, Frameworks]
tags: [solidjs, reactive, chrome-extension]
keywords: "chrome extension solid js, solidjs chrome extension, solid js popup chrome, reactive chrome extension, solid chrome extension tutorial"
canonical_url: "https://bestchromeextensions.com/2025/04/04/chrome-extension-solid-js-reactive-ui/"
---

# Build Chrome Extensions with SolidJS: Fine-Grained Reactive UI

Modern Chrome extension development has evolved significantly with the introduction of frameworks that bring reactivity and component-based architecture to browser extensions. SolidJS, with its unique fine-grained reactivity system, offers a compelling choice for building Chrome extensions that are incredibly performant and maintainable. This comprehensive guide will walk you through building Chrome extensions with SolidJS, exploring how its reactive paradigm transforms popup development and extension UI.

If you have been building Chrome extensions with vanilla JavaScript or React, you will discover why SolidJS deserves a spot in your extension development toolkit. The framework's compiler-first approach generates optimized code that updates only what changes, making it ideal for the constrained environment of browser extensions where every kilobyte and millisecond matters.

---

## Why SolidJS for Chrome Extensions? {#why-solidjs}

Chrome extensions present unique challenges that make SolidJS an excellent choice. The popup interface must load quickly, respond instantly to user interactions, and maintain a small bundle size. Traditional React-based extensions often ship more JavaScript than necessary because React's virtual DOM diffing algorithm requires runtime overhead. SolidJS takes a fundamentally different approach that addresses these concerns directly.

### Fine-Grained Reactivity Explained

SolidJS uses a reactive primitive system based on signals and effects. Unlike React's reconciliation process that re-renders entire component trees when state changes, SolidJS compiles reactive statements into direct DOM updates. When you modify a signal, only the specific DOM nodes bound to that signal receive updates. This surgical precision eliminates the overhead of virtual DOM diffing entirely.

Consider a simple example: a Chrome extension popup that displays the current tab's title and URL. With React, changing the URL would trigger a re-render of the component and its children. With SolidJS, only the specific text node containing the URL updates directly. The difference becomes more pronounced as your extension grows in complexity.

```javascript
import { createSignal, createEffect } from 'solid-js';

function Popup() {
  const [tabInfo, setTabInfo] = createSignal({ title: '', url: '' });
  
  // This effect runs once, and the callback is tracked
  createEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setTabInfo(tabs[0]);
    });
  });

  return (
    <div>
      <h1>{tabInfo().title}</h1>
      <p>{tabInfo().url}</p>
    </div>
  );
}
```

This code looks similar to React, but under the hood, the compilation process transforms this into efficient DOM operations. The reactive primitives create subscriptions that connect directly to the DOM without intermediate virtual DOM representation.

### Bundle Size Advantages

SolidJS's small footprint is remarkable. The core library ships at approximately 7KB gzipped, compared to React's 40KB+ for the core plus additional bytes for ReactDOM. For Chrome extensions where every kilobyte affects load time and perceived performance, this difference is significant.

The implications extend beyond initial load times. Smaller bundles mean faster parsing and JavaScript compilation, resulting in more responsive popup interactions. Users experience near-instantaneous UI updates, which is crucial for extensions where quick feedback is expected.

---

## Setting Up Your SolidJS Chrome Extension Project {#project-setup}

Creating a SolidJS-powered Chrome extension requires proper tooling configuration. While you can set up everything manually, using a template designed for this purpose accelerates development significantly.

### Prerequisites and Installation

Ensure you have Node.js installed, then create your project using a SolidJS-compatible bundler. Vite, the modern build tool, has excellent support for SolidJS through official plugins.

```bash
# Create a new Vite project with SolidJS template
npm create vite@latest my-solid-extension -- --template solid-ts

# Navigate to the project
cd my-solid-extension

# Install dependencies
npm install

# Install Chrome extension-related dependencies
npm install -D vite-plugin-chrome-extension-manifest
```

The `vite-plugin-chrome-extension-manifest` plugin handles the complexities of generating the `manifest.json` file from your configuration, ensuring Manifest V3 compliance while keeping your extension architecture clean.

### Configuring Vite for Chrome Extensions

Modify your `vite.config.ts` to properly build a Chrome extension:

```typescript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import chromeExtensionManifest from 'vite-plugin-chrome-extension-manifest';

export default defineConfig({
  plugins: [
    solidPlugin(),
    chromeExtensionManifest({
      manifest: {
        manifest_version: 3,
        name: 'SolidJS Extension',
        version: '1.0.0',
        description: 'A Chrome extension built with SolidJS',
        action: {
          default_popup: 'index.html',
          default_icon: 'icon.png'
        },
        permissions: ['activeTab', 'storage'],
        host_permissions: ['<all_urls>']
      }
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html'
      }
    }
  }
});
```

This configuration generates a proper Chrome extension structure with Manifest V3, ready for loading into Chrome. The build output includes your optimized JavaScript bundle, HTML popup file, and the manifest.

---

## Building the Popup Interface {#popup-interface}

The popup is the most common extension UI component, serving as the primary interaction point for users. SolidJS excels at building responsive, data-driven popup interfaces.

### Creating Reactive Components

Building a feature-rich popup requires organizing your code into reusable components. SolidJS's component model encourages composition while maintaining the performance benefits of fine-grained reactivity.

```typescript
// components/TabInfo.tsx
import { createSignal, createEffect, onMount, For, Show } from 'solid-js';

interface TabData {
  id: number;
  title: string;
  url: string;
  favicon?: string;
}

export function TabInfo() {
  const [tab, setTab] = createSignal<TabData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      setTab(activeTab as TabData);
    } catch (err) {
      setError('Failed to fetch tab information');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="tab-info">
      <Show when={loading()}>
        <div class="loading">Loading...</div>
      </Show>
      
      <Show when={error()}>
        <div class="error">{error()}</div>
      </Show>
      
      <Show when={tab()}>
        <div class="tab-details">
          <img 
            src={tab()?.favicon || 'default-icon.png'} 
            alt="Favicon" 
            class="favicon"
          />
          <div class="tab-content">
            <h3 class="tab-title">{tab()?.title}</h3>
            <p class="tab-url">{tab()?.url}</p>
          </div>
        </div>
      </Show>
    </div>
  );
}
```

This component demonstrates SolidJS's control flow components: `<Show>` for conditional rendering and `<For>` for lists. Unlike React's map function that requires keys for reconciliation, Solid's `<For>` component optimizes list rendering by tracking items through references.

### State Management with Stores

For more complex extensions with multiple related state values, SolidJS provides stores that work seamlessly with the reactivity system.

```typescript
// stores/extensionStore.ts
import { createStore } from 'solid-js/store';

interface ExtensionState {
  tabs: TabData[];
  settings: {
    theme: 'light' | 'dark';
    autoSave: boolean;
  };
  isLoading: boolean;
}

const [state, setState] = createStore<ExtensionState>({
  tabs: [],
  settings: {
    theme: 'light',
    autoSave: true
  },
  isLoading: false
});

// Helper functions for state updates
function addTab(tab: TabData) {
  setState('tabs', (tabs) => [...tabs, tab]);
}

function updateSettings(updates: Partial<ExtensionState['settings']>) {
  setState('settings', (settings) => ({ ...settings, ...updates }));
}

function toggleLoading() {
  setState('isLoading', (loading) => !loading);
}

export { state, setState, addTab, updateSettings, toggleLoading };
```

The store's nested reactivity allows fine-grained updates. Changing `state.settings.theme` updates only components observing that specific property, not the entire settings section or the parent state object.

---

## Communicating with Background Scripts {#background-communication}

Chrome extensions use message passing for communication between content scripts, popup, and background service workers. SolidJS provides patterns that make this communication elegant and type-safe.

### Setting Up Message Handling

Create a messaging system that leverages TypeScript for type safety across your extension:

```typescript
// messaging/types.ts
export interface ExtensionMessage {
  type: 'GET_TABS' | 'UPDATE_SETTINGS' | 'FETCH_DATA';
  payload?: unknown;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// messaging/popup-client.ts
type MessageHandler = (message: ExtensionMessage) => Promise<MessageResponse>;

export function sendMessage<T>(message: ExtensionMessage): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<MessageResponse<T>>;
}

export function useMessageSender() {
  const send = async <T>(type: ExtensionMessage['type'], payload?: unknown) => {
    const response = await sendMessage<T>({ type, payload });
    if (!response.success) {
      throw new Error(response.error || 'Message failed');
    }
    return response.data;
  };

  return { send };
}
```

### Integrating with Background Scripts

Your background service worker can handle messages from the popup:

```javascript
// background/index.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  async function handleMessage() {
    switch (message.type) {
      case 'GET_TABS':
        const tabs = await chrome.tabs.query({});
        return { success: true, data: tabs };
        
      case 'FETCH_DATA':
        const data = await fetchFromStorage(message.payload);
        return { success: true, data };
        
      default:
        return { success: false, error: 'Unknown message type' };
    }
  }
  
  handleMessage().then(sendResponse);
  return true; // Keep channel open for async response
});
```

This pattern maintains clean separation between your SolidJS popup and the extension's background logic while providing a type-safe interface for communication.

---

## Content Script Integration {#content-scripts}

SolidJS can also power content scripts that run within web pages, though the approach differs slightly from popup development due to the isolated world context.

### Mounting SolidJS in Content Scripts

Content scripts share the page's DOM but run in an isolated JavaScript context. To render SolidJS components in this environment:

```typescript
// content-script.tsx
/* @refresh reload */
import { render } from 'solid-js/web';
import { ContentWidget } from './components/ContentWidget';
import './content-styles.css';

// Create a container element
const container = document.createElement('div');
container.id = 'solid-extension-widget';
document.body.appendChild(container);

// Mount the SolidJS app
render(() => <ContentWidget />, container);
```

The content script approach works well for overlay widgets, page analyzers, and tools that need to interact directly with page content. SolidJS's small footprint is particularly valuable here since content scripts run on every page the extension matches.

---

## Performance Optimization Techniques {#performance-optimization}

Building performant Chrome extensions requires attention to several optimization strategies specific to the extension environment.

### Lazy Loading and Code Splitting

Vite automatically code-splits based on dynamic imports, but you can further optimize by lazy loading non-critical components:

```typescript
import { lazy, Suspense } from 'solid-js';

const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

function Popup() {
  const [showSettings, setShowSettings] = createSignal(false);

  return (
    <div>
      <button onClick={() => setShowSettings(true)}>Settings</button>
      <Suspense fallback={<div>Loading...</div>}>
        <Show when={showSettings()}>
          <SettingsPanel />
        </Show>
      </Suspense>
    </div>
  );
}
```

### Memoization with createMemo

For expensive computations that depend on reactive data, `createMemo` caches results and only recalculates when dependencies change:

```typescript
import { createMemo } from 'solid-js';

function TabList() {
  const [tabs, setTabs] = createSignal<Tab[]>([]);
  
  // Only recalculates when tabs() changes
  const sortedTabs = createMemo(() => {
    return [...tabs()].sort((a, b) => a.title.localeCompare(b.title));
  });
  
  const tabCount = createMemo(() => tabs().length);
  
  return (
    <div>
      <p>Total tabs: {tabCount()}</p>
      <ul>
        <For each={sortedTabs()}>
          {(tab) => <li>{tab.title}</li>}
        </For>
      </ul>
    </div>
  );
}
```

This pattern prevents unnecessary recalculations, crucial for extensions that process large datasets or perform complex filtering operations.

---

## Testing Your SolidJS Extension {#testing}

Reliable extensions require thorough testing across multiple contexts: popup, content scripts, and background workers.

### Unit Testing Components

SolidJS components can be tested using solid-testing-library:

```typescript
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { TabInfo } from './components/TabInfo';

describe('TabInfo', () => {
  it('displays loading state initially', () => {
    const { getByText } = render(() => <TabInfo />);
    expect(getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Extension-Specific Testing

Chrome provides testing utilities that work well with SolidJS:

```typescript
import { ExtensionPage } from '@chrome/test-sequencer';

describe('Extension Popup', () => {
  it('loads without errors', async () => {
    const popup = await ExtensionPage.create('popup.html');
    await popup.waitForSelector('.tab-info');
  });
});
```

---

## Deployment and Publishing {#deployment}

Once your SolidJS extension is ready, building for production follows standard Chrome Web Store procedures with some considerations for framework-based extensions.

### Production Build

Generate the production build with optimizations:

```bash
npm run build
```

The output in the `dist` folder contains your extension files ready for packaging. Review the generated manifest and ensure all required files are included.

### Chrome Web Store Submission

When submitting your extension, highlight SolidJS benefits in your description: blazing-fast performance, small bundle size, and modern development experience. The store listing should emphasize the user-facing benefits while your documentation can explore the technical advantages.

---

## Conclusion {#conclusion}

SolidJS offers a compelling framework for Chrome extension development, bringing fine-grained reactivity to browser extension UI in a way that outperforms traditional virtual DOM approaches. The combination of small bundle sizes, direct DOM updates, and a gentle learning curve for developers familiar with React makes SolidJS an excellent choice for your next extension project.

The patterns covered in this guide—reactive components, stores for state management, message passing for background communication, and performance optimization techniques—provide a solid foundation for building production-ready Chrome extensions. As the extension ecosystem continues to evolve, SolidJS's compiler-first approach positions your extensions for the future while delivering exceptional user experiences today.

Start building with SolidJS and experience the difference that true reactive UI makes in Chrome extension development.
