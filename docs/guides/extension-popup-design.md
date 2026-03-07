# Chrome Extension Popup Design Patterns

The popup is often the first interaction users have with your Chrome extension. A well-designed popup provides instant functionality without requiring users to navigate to a separate options page. This guide covers architecture patterns, lifecycle management, framework integrations, and UX best practices for building professional Chrome extension popups.

## Table of Contents

- [Popup HTML/CSS/JS Architecture](#popup-htmlcssjs-architecture)
- [Popup Lifecycle](#popup-lifecycle)
- [Dimensions and Constraints](#dimensions-and-constraints)
- [Framework Setups](#framework-setups)
- [State Persistence](#state-persistence)
- [Service Worker Communication](#service-worker-communication)
- [Theme Support](#theme-support)
- [Responsive Design](#responsive-design)
- [Animations and Transitions](#animations-and-transitions)
- [Loading and Error States](#loading-and-error-states)
- [Accessibility](#accessibility)
- [Reference](#reference)

---

## Popup HTML/CSS/JS Architecture

### Basic Structure

The popup consists of three main files referenced in your manifest:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon-16.png" }
  }
}
```

### Standard File Organization

```
my-extension/
├── popup/
│   ├── popup.html      # Entry point
│   ├── popup.css       # Styles
│   ├── popup.js        # Logic
│   └── components/     # Reusable UI components
├── icons/
└── manifest.json
```

### Minimal Popup HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Extension</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <!-- Content goes here -->
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

---

## Popup Lifecycle

Understanding the popup lifecycle is crucial for proper resource management and user experience.

### Open → Render → Close Flow

```javascript
// popup.js - Lifecycle management

class PopupController {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      // 1. Load persisted state
      await this.loadState();
      
      // 2. Render UI
      this.render();
      
      // 3. Set up event listeners
      this.bindEvents();
      
      // 4. Establish service worker connection
      await this.connectToServiceWorker();
    } catch (error) {
      this.showError(error);
    }
  }

  async loadState() {
    const result = await chrome.storage.local.get(['userPrefs', 'cache']);
    this.state = { ...this.defaultState, ...result };
  }

  render() {
    // Render based on current state
    document.getElementById('app').innerHTML = this.template(this.state);
  }

  bindEvents() {
    document.getElementById('action-btn')?.addEventListener('click', () => {
      this.handleAction();
    });
  }

  async connectToServiceWorker() {
    // Message passing setup
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
  }

  // Cleanup on popup close
  cleanup() {
    // Save state before closing
    chrome.storage.local.set({ userPrefs: this.state.userPrefs });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  
  // Chrome fires this when popup is about to close
  window.addEventListener('unload', () => {
    popup.cleanup();
  });
});
```

### Lifecycle Events

| Event | Description | Use Case |
|-------|-------------|----------|
| `DOMContentLoaded` | HTML parsed, DOM ready | Initialize app |
| `load` | All resources loaded | Start async operations |
| `unload` | Popup closing | Save state, cleanup |

---

## Dimensions and Constraints

Chrome imposes strict limits on popup dimensions that you must design around.

### Size Limits

- **Maximum width**: 800px
- **Maximum height**: 600px
- **Default size**: Varies by Chrome version
- **Minimum size**: Enforced by content (no hard minimum)

### Best Practices for Dimensions

```css
/* popup.css */
:root {
  --popup-width: 400px;
  --popup-height: 500px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

body {
  width: var(--popup-width);
  height: var(--popup-height);
  min-height: 200px;
  max-width: 800px;
  max-height: 600px;
  margin: 0;
  padding: var(--spacing-md);
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Enable scrolling for content overflow */
#app {
  height: 100%;
  overflow-y: auto;
}
```

### Manifest Configuration

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_width": 400,
    "default_height": 500
  }
}
```

---

## Framework Setups

### React/Preact Popup

Using React or Preact provides component-based architecture and state management.

```javascript
// popup.jsx - React setup
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
```

```jsx
// App.jsx - Main component
import React, { useState, useEffect } from 'react';
import { useChromeStorage } from './hooks/useChromeStorage';
import Header from './components/Header';
import Content from './components/Content';
import LoadingSkeleton from './components/LoadingSkeleton';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useChromeStorage('local', 'userPrefs', {});

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await chrome.runtime.sendMessage({ 
          type: 'FETCH_DATA' 
        });
        setData(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

  return (
    <div className="popup-container">
      <Header prefs={prefs} onUpdate={setPrefs} />
      <Content data={data} />
    </div>
  );
}
```

### Vue Popup Setup

```javascript
// main.js - Vue 3 setup
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.mount('#app');
```

```vue
<!-- App.vue -->
<template>
  <div class="popup" :class="{ 'dark-mode': isDarkMode }">
    <header class="popup-header">
      <h1>{{ title }}</h1>
      <ThemeToggle @toggle="toggleTheme" />
    </header>
    
    <main class="popup-content">
      <div v-if="loading" class="skeleton-loader">
        <div v-for="i in 3" :key="i" class="skeleton-item"></div>
      </div>
      
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="retry">Retry</button>
      </div>
      
      <ul v-else class="data-list">
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
      </ul>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const loading = ref(true);
const error = ref(null);
const items = ref([]);
const isDarkMode = ref(false);

onMounted(async () => {
  const prefs = await chrome.storage.local.get('prefs');
  isDarkMode.value = prefs.prefs?.darkMode || false;
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ITEMS' });
    items.value = response.items;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

function retry() {
  loading.value = true;
  error.value = null;
  onMounted();
}
</script>
```

### Svelte Popup Setup

```html
<!-- Popup.svelte -->
<script>
  import { onMount } from 'svelte';
  
  let data = null;
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      data = await chrome.runtime.sendMessage({ type: 'FETCH_DATA' });
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });
  
  async function retry() {
    loading = true;
    error = null;
    try {
      data = await chrome.runtime.sendMessage({ type: 'FETCH_DATA' });
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="popup">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
      <button on:click={retry}>Retry</button>
    </div>
  {:else}
    <ul class="items">
      {#each data.items as item}
        <li>{item.name}</li>
      {/each}
    </ul>
  {/if}
</div>
```

### Vanilla JS Patterns

```javascript
// popup.js - Clean vanilla JS architecture
const App = {
  state: {
    items: [],
    filter: '',
    loading: false,
    error: null
  },

  async init() {
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    document.getElementById('filter')?.addEventListener('input', (e) => {
      this.state.filter = e.target.value;
      this.render();
    });

    document.getElementById('refresh')?.addEventListener('click', () => {
      this.loadData();
    });
  },

  async loadData() {
    this.state.loading = true;
    this.render();

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_DATA' });
      this.state.items = response.data;
      this.state.error = null;
    } catch (err) {
      this.state.error = err.message;
    } finally {
      this.state.loading = false;
      this.render();
    }
  },

  render() {
    const app = document.getElementById('app');
    
    if (this.state.loading) {
      app.innerHTML = this.loadingTemplate();
      return;
    }

    if (this.state.error) {
      app.innerHTML = this.errorTemplate();
      return;
    }

    app.innerHTML = this.contentTemplate();
  },

  loadingTemplate() {
    return `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  },

  errorTemplate() {
    return `
      <div class="error">
        <p>Error: ${this.state.error}</p>
        <button id="retry-btn">Retry</button>
      </div>
    `;
  },

  contentTemplate() {
    const filtered = this.state.items.filter(item => 
      item.name.toLowerCase().includes(this.state.filter.toLowerCase())
    );
    
    return `
      <input type="text" id="filter" placeholder="Filter..." value="${this.state.filter}">
      <ul class="items">
        ${filtered.map(item => `<li>${item.name}</li>`).join('')}
      </ul>
      <button id="refresh">Refresh</button>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
```

---

## State Persistence

Maintaining state across popup opens improves user experience significantly.

### Using chrome.storage

```javascript
// State persistence utilities
const Storage = {
  async get(key, defaultValue = null) {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? defaultValue;
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async remove(key) {
    await chrome.storage.local.remove(key);
  },

  // Subscribe to changes across contexts
  observe(key, callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && key in changes) {
        callback(changes[key].newValue);
      }
    });
  }
};

// Usage in popup
class StatefulPopup {
  constructor() {
    this.state = {
      lastOpened: Date.now(),
      viewCount: 0,
      userData: null
    };
  }

  async init() {
    // Load persisted state
    const saved = await Storage.get('popupState', {});
    this.state = { ...this.state, ...saved };
    
    // Increment view count
    this.state.viewCount++;
    
    // Save updated state
    await Storage.set('popupState', this.state);
  }
}
```

### State Sync Between Contexts

```javascript
// Service worker - background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_STATE') {
    // Broadcast to all open popups
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATED',
      payload: message.payload
    });
  }
  return true;
});

// Popup - Listen for updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') {
    this.updateUI(message.payload);
  }
});
```

---

## Service Worker Communication

The popup communicates with the service worker for data processing and storage operations.

### Message Passing Pattern

```javascript
// Popup → Service Worker communication

// Sending messages from popup
async function fetchFromServiceWorker(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Usage
const data = await fetchFromServiceWorker('GET_ANALYTICS', { range: 'week' });

// Service worker handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ANALYTICS':
      handleGetAnalytics(message.payload)
        .then(sendResponse);
      return true; // Keep message channel open for async response
  }
});
```

### Long-Lived Connections

```javascript
// For real-time updates, use port connections
const port = chrome.runtime.connect({ name: 'popup' });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.postMessage({ type: 'INIT', tabId: chrome.devtools?.inspectedWindow?.tabId });
```

---

## Theme Support

### Dark Mode Support

```css
/* popup.css - Theme variables */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1f1f1f;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent-color: #4285f4;
}

/* Dark mode - triggered by class or system preference */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1f1f1f;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
    --border-color: #404040;
  }
}

/* Manual dark mode toggle */
body.dark-mode {
  --bg-primary: #1f1f1f;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

### System Theme Detection

```javascript
// Detect system theme preference
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
}

// Listen for theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.body.classList.toggle('dark-mode', e.matches);
  // Optionally persist the preference
  chrome.storage.local.set({ theme: e.matches ? 'dark' : 'light' });
});
```

---

## Responsive Design

### Flexible Layouts

```css
/* Responsive popup design */
.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  max-height: 600px;
}

/* Stack on narrow widths, row on wider */
@media (min-width: 400px) {
  .popup-layout {
    flex-direction: row;
  }
  
  .sidebar {
    width: 120px;
    flex-shrink: 0;
  }
  
  .content {
    flex: 1;
  }
}

/* Touch-friendly sizing for mobile */
@media (max-width: 360px) {
  :root {
    --spacing-md: 12px;
  }
  
  button, input {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

## Animations and Transitions

### Smooth Transitions

```css
/* CSS animations */
.fade-enter {
  opacity: 0;
}

.fade-enter-active {
  opacity: 1;
  transition: opacity 200ms ease-in;
}

.fade-exit {
  opacity: 1;
}

.fade-exit-active {
  opacity: 0;
  transition: opacity 200ms ease-out;
}

/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## Loading and Error States

### Skeleton Loading

```css
/* Skeleton loader styles */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--border-color) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
```

### Error States with Retry

```javascript
// Error handling with retry logic
class ErrorHandler {
  constructor(maxRetries = 3, delay = 1000) {
    this.maxRetries = maxRetries;
    this.delay = delay;
  }

  async withRetry(fn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay * attempt; // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
}
```

---

## Accessibility

### A11y Best Practices

```html
<!-- Semantic HTML and ARIA labels -->
<div role="main" aria-label="Extension popup">
  <header role="banner">
    <h1>My Extension</h1>
  </header>
  
  <nav role="navigation" aria-label="Quick actions">
    <button aria-describedby="refresh-desc">
      Refresh
      <span id="refresh-desc" class="sr-only">Refresh the data</span>
    </button>
  </nav>
  
  <ul role="list" aria-live="polite">
    <li role="listitem">Item 1</li>
  </ul>
  
  <footer role="contentinfo">
    <button aria-label="Settings">⚙️</button>
  </footer>
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
```

### Keyboard Navigation

```javascript
// Keyboard navigation support
document.addEventListener('keydown', (e) => {
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableContent = document.querySelectorAll(focusableElements);
  const firstElement = focusableContent[0];
  const lastElement = focusableContent[focusableContent.length - 1];

  // Tab navigation
  if (e.key === 'Tab') {
    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  // Escape to close
  if (e.key === 'Escape') {
    window.close();
  }
});
```

---

## Reference

For more detailed information, visit the official Chrome documentation:

- [Add a Popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)
- [Manifest - Action](https://developer.chrome.com/docs/extensions/mv3/manifest/activeTab/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/mv3/storage/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
