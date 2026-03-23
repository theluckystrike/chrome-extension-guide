---
layout: post
title: "Building Chrome Extensions with SolidJS: Reactive and Fast"
description: "Discover how to build high-performance Chrome extensions using SolidJS. Learn why SolidJS is an excellent choice for extension UI development with its fine-grained reactivity and minimal bundle size."
date: 2025-01-23
categories: [tutorials, chrome-extensions, solidjs]
tags: [solidjs chrome extension, solid js extension, reactive extension ui, manifest v3, web components]
keywords: "solidjs chrome extension, solid js extension, reactive extension ui, chrome extension solidjs tutorial"
canonical_url: "https://bestchromeextensions.com/2025/01/23/chrome-extension-solid-js/"
---

# Building Chrome Extensions with SolidJS: Reactive and Fast

When it comes to building Chrome extensions, developers traditionally reach for React, Vue, or vanilla JavaScript. However, there's a compelling alternative that deserves more attention: SolidJS. This fine-grained reactive library offers exceptional performance characteristics that make it particularly well-suited for extension development. we'll explore how to build Chrome extensions with SolidJS, examining the benefits, challenges, and practical implementation patterns.

SolidJS has been gaining significant traction in the web development community, and for good reason. Its unique approach to reactivity, using fine-grained proxies instead of a virtual DOM, results in blazing-fast performance and minimal memory overhead. These characteristics align perfectly with the constraints of Chrome extension development, where performance and resource efficiency are paramount.

---

Why SolidJS for Chrome Extensions? {#why-solidjs}

Chrome extensions operate in a unique environment with specific constraints that make SolidJS an attractive choice. Understanding these benefits will help you decide if SolidJS is the right framework for your next extension project.

Exceptional Performance

SolidJS stands out for its remarkable performance characteristics. Unlike React, which uses a virtual DOM and re-renders component trees, SolidJS compiles templates to real DOM nodes and uses fine-grained proxies to update only the exact elements that change. This approach eliminates the overhead of diffing algorithms and unnecessary re-renders.

For Chrome extensions, this performance benefit translates to faster popup open times, smoother user interactions, and reduced CPU usage when your extension is active. Users appreciate extensions that feel instantaneous, and SolidJS helps you achieve that native-like responsiveness.

Consider a popup that displays a list of tabs or bookmarks. With React, changing a single item in the list might trigger re-renders of the entire list component. With SolidJS, only the specific text node that changed gets updated. The difference is especially noticeable on lower-end devices or when handling large datasets.

Minimal Bundle Size

Bundle size is critical for Chrome extensions. Smaller extensions load faster, use less memory, and provide a better user experience. SolidJS core library is remarkably small, around 7KB gzipped, making it one of the most lightweight reactive frameworks available.

When you pair SolidJS with a build tool like Vite, you can achieve incredibly small bundle sizes. This is particularly important for extensions that need to load quickly in the background service worker or when the user clicks the extension icon.

Compare this to React, which requires react-dom and often additional libraries for state management. A typical React-based extension can easily exceed 100KB, while a SolidJS equivalent might be under 30KB. For extensions distributed through the Chrome Web Store, this size difference matters.

True Reactivity Without Complexity

SolidJS's reactivity system is intuitive and powerful. Unlike some frameworks that require learning complex patterns like reducers, contexts, or memoization to avoid unnecessary re-renders, SolidJS primitives are inherently efficient. When you modify a signal, only the dependent code runs, automatically, without requiring explicit optimization.

This simplicity accelerates development and reduces bugs. You spend less time debugging performance issues and more time building features. For developers new to reactive programming, SolidJS provides a gentler learning curve while still delivering excellent performance.

---

Setting Up Your SolidJS Chrome Extension Project {#project-setup}

Let's build a practical Chrome extension with SolidJS to demonstrate the development workflow. We'll create a simple extension that helps users manage their reading list directly from the browser toolbar.

Prerequisites

Before starting, ensure you have Node.js (version 16 or higher) installed. You'll also need Chrome or Chromium-based browser for testing. We'll use Vite as our build tool because of its excellent SolidJS support and fast development experience.

Creating the Project

Initialize a new Vite project with the SolidJS template:

```bash
npm create vite@latest my-extension -- --template solid-ts
cd my-extension
npm install
```

This command creates a TypeScript-based SolidJS project with all the necessary configurations. TypeScript support is particularly valuable for Chrome extension development, where the Chrome APIs have complex type signatures.

Configuring the Build

Modify your `vite.config.ts` to output a format suitable for Chrome extensions:

```typescript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'chrome120',
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html',
        options: 'options.html'
      }
    }
  },
  base: './'
});
```

The `base: './'` setting is crucial for extensions, as it ensures all asset paths work correctly regardless of the extension's URL.

Creating the Manifest

Every Chrome extension needs a `manifest.json` file. Create this file in your project root:

```json
{
  "manifest_version": 3,
  "name": "Reading List Manager",
  "version": "1.0",
  "description": "Manage your reading list with SolidJS",
  "action": {
    "default_popup": "index.html",
    "default_icon": "icon.png"
  },
  "options_page": "options.html",
  "permissions": ["storage", "tabs"],
  "host_permissions": ["<all_urls>"]
}
```

Manifest V3 is the current standard, and it works well with SolidJS. The popup will render our SolidJS app, and we'll use the storage API to persist the reading list.

---

Building the Extension UI with SolidJS {#building-ui}

Now let's create the actual extension interface. We'll build a reading list manager that demonstrates SolidJS's reactivity features.

The Main Popup

Modify `src/App.tsx` to create the popup interface:

{% raw %}
```tsx
import { createSignal, createEffect, For, Show } from 'solid-js';

interface Book {
  id: string;
  title: string;
  url: string;
  addedAt: number;
}

function App() {
  const [books, setBooks] = createSignal<Book[]>([]);
  const [newBookUrl, setNewBookUrl] = createSignal('');
  const [loading, setLoading] = createSignal(true);

  // Load books from storage on mount
  createEffect(async () => {
    const result = await chrome.storage.local.get('readingList');
    setBooks(result.readingList || []);
    setLoading(false);
  });

  // Save books when they change
  createEffect(() => {
    if (!loading()) {
      chrome.storage.local.set({ readingList: books() });
    }
  });

  const addBook = async () => {
    const url = newBookUrl().trim();
    if (!url) return;

    // Get page title from the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const title = tab?.title || url;

    const newBook: Book = {
      id: Date.now().toString(),
      title,
      url,
      addedAt: Date.now()
    };

    setBooks([...books(), newBook]);
    setNewBookUrl('');
  };

  const removeBook = (id: string) => {
    setBooks(books().filter(book => book.id !== id));
  };

  const openBook = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div style={{ "min-width": "320px", padding: "16px" }}>
      <h2>Reading List</h2>
      
      <div style={{ display: "flex", gap: "8px", "margin-bottom": "16px" }}>
        <input
          type="text"
          value={newBookUrl()}
          onInput={(e) => setNewBookUrl(e.currentTarget.value)}
          placeholder="Enter URL or use current page"
          style={{ flex: "1", padding: "8px" }}
        />
        <button onClick={addBook} style={{ padding: "8px 16px" }}>
          Add
        </button>
      </div>

      <Show when={!loading()} fallback={<p>Loading...</p>}>
        <ul style={{ "list-style": "none", padding: "0" }}>
          <For each={books()}>
            {(book) => (
              <li style={{ 
                display: "flex", 
                "justify-content": "space-between", 
                "align-items": "center",
                padding: "8px",
                "border-bottom": "1px solid #eee"
              }}>
                <span 
                  onClick={() => openBook(book.url)}
                  style={{ cursor: "pointer", flex: "1" }}
                >
                  {book.title}
                </span>
                <button 
                  onClick={() => removeBook(book.id)}
                  style={{ "margin-left": "8px" }}
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
        
        <Show when={books().length === 0}>
          <p style={{ color: "#666", "text-align": "center" }}>
            No items in your reading list
          </p>
        </Show>
      </Show>
    </div>
  );
}

export default App;
```
{% endraw %}

This example showcases several SolidJS patterns that make development pleasant and efficient. The `createSignal` hook creates reactive state, `createEffect` handles side effects like loading and saving data, and `For` and `Show` are control flow components that update efficiently.

The Options Page

Create an options page for additional settings in `src/Options.tsx`:

{% raw %}
```tsx
import { createSignal } from 'solid-js';

function Options() {
  const [theme, setTheme] = createSignal('light');

  const saveSettings = async () => {
    await chrome.storage.sync.set({ theme: theme() });
    alert('Settings saved!');
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Extension Settings</h1>
      
      <div style={{ "margin-bottom": "16px" }}>
        <label>
          <input 
            type="radio" 
            name="theme" 
            checked={theme() === 'light'}
            onChange={() => setTheme('light')}
          />
          Light Theme
        </label>
      </div>
      
      <div style={{ "margin-bottom": "16px" }}>
        <label>
          <input 
            type="radio" 
            name="theme" 
            checked={theme() === 'dark'}
            onChange={() => setTheme('dark')}
          />
          Dark Theme
        </label>
      </div>

      <button onClick={saveSettings}>Save Settings</button>
    </div>
  );
}

export default Options;
```
{% endraw %}

---

Working with Chrome APIs in SolidJS {#chrome-apis}

Chrome extensions interact with browser APIs extensively. SolidJS works smoothly with these APIs, though there are some patterns worth understanding.

Type Definitions

Install the Chrome types to get TypeScript support:

```bash
npm install -D @types/chrome
```

Add Chrome types to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["chrome"]
  }
}
```

Handling Asynchronous APIs

Chrome APIs are predominantly asynchronous. SolidJS handles async operations elegantly through effects and resources:

```tsx
import { createResource, createSignal } from 'solid-js';

async function fetchTabs() {
  return await chrome.tabs.query({ currentWindow: true });
}

function TabList() {
  const [tabs, { refetch }] = createResource(fetchTabs);

  return (
    <div>
      <button onClick={refetch}>Refresh Tabs</button>
      {tabs.loading && <p>Loading tabs...</p>}
      {tabs() && (
        <ul>
          {tabs().map(tab => (
            <li>{tab.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

The `createResource` primitive is particularly useful for data fetching, handling loading states automatically.

Message Passing

Communicating between extension components (popup, background script, content scripts) requires message passing:

```tsx
// In popup
const sendToBackground = (message: object) => {
  chrome.runtime.sendMessage(message);
};

// In background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received:', message);
  sendResponse({ success: true });
});
```

---

Content Scripts with SolidJS {#content-scripts}

Content scripts run in the context of web pages and can be built with SolidJS as well. However, there are additional considerations for this scenario.

Injection Strategy

Content scripts cannot be loaded the same way as regular web pages due to Chrome's content script isolation. The recommended approach is to build your SolidJS app, then inject it into the page:

```typescript
// content-script.ts
import { render } from 'solid-js/web';
import ContentApp from './ContentApp';

function injectApp() {
  const container = document.createElement('div');
  container.id = 'my-extension-root';
  document.body.appendChild(container);
  render(() => <ContentApp />, container);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectApp);
} else {
  injectApp();
}
```

Configure the content script in your manifest:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }]
}
```

Styling Considerations

Content scripts share the page's CSS, which can cause conflicts. Use Shadow DOM or unique class names to isolate your styles:

```tsx
import { render } from 'solid-js/web';
import App from './App';

function mountApp() {
  const host = document.createElement('div');
  host.style.all = 'initial';
  document.body.appendChild(host);
  
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  
  render(() => <App />, container);
}
```

---

Performance Optimization Tips {#performance-tips}

While SolidJS is inherently fast, follow these tips to maximize your extension's performance.

Lazy Loading

Load heavy components only when needed:

```tsx
import { lazy, Suspense } from 'solid-js';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

Memoization

While SolidJS handles most dependencies automatically, use `createMemo` for expensive computations:

```tsx
import { createMemo } from 'solidjs';

const processedData = createMemo(() => {
  return heavyComputation(largeDataset());
});
```

Minimize Background Activity

Avoid unnecessary background processing. Use Chrome's event-driven APIs instead of polling:

```typescript
// Good: Use Chrome's built-in events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Handle tab updates
});

// Avoid: Polling
setInterval(() => {
  // Check something repeatedly - wastes resources
}, 1000);
```

---

Testing Your Extension {#testing}

Proper testing ensures your extension works correctly across different scenarios.

Loading Unpacked

To test your built extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select your `dist` folder (or wherever Vite outputs the build)

Debugging

Access the popup's developer tools by right-clicking your extension icon and selecting "Inspect popup". For background scripts, click "service worker" link in the extension details page.

---

Building for Production {#production-build}

When you're ready to publish, create a production build:

```bash
npm run build
```

This generates optimized files in your output directory. Before publishing to the Chrome Web Store, verify:

- All required icons are present
- Manifest is valid JSON
- Permissions are minimal and justified
- No console errors in production build

Package your extension using the Chrome Web Store developer dashboard or the `chrome-webstore-upload` tool if you want to automate releases.

---

Conclusion {#conclusion}

SolidJS offers a compelling alternative to traditional frameworks for Chrome extension development. Its fine-grained reactivity delivers exceptional performance with minimal bundle size, while its simple programming model accelerates development. The combination of these factors makes SolidJS an excellent choice for building modern Chrome extensions that users will love.

The patterns and techniques covered in this guide provide a solid foundation for creating your own SolidJS-powered extensions. From project setup to production deployment, SolidJS simplifies each step while maintaining the performance characteristics that users expect from well-built extensions.

As the Chrome extension ecosystem continues to evolve, frameworks like SolidJS that prioritize performance and developer experience will become increasingly valuable. Start building with SolidJS today, and you'll have a powerful, efficient extension ready for the Chrome Web Store in no time.
