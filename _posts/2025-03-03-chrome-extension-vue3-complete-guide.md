---
layout: post
title: "Build a Chrome Extension with Vue 3: Complete Tutorial for 2025"
description: "Build Chrome extensions with Vue 3 in 2025. Complete tutorial covering project setup, popup UI, state management, and Chrome Web Store publishing."
date: 2025-03-03
categories: [Chrome-Extensions, Frameworks]
tags: [vue, chrome-extension, tutorial]
keywords: "chrome extension vue 3, vue chrome extension, build extension vue, vue 3 popup chrome extension, vue chrome extension tutorial"
canonical_url: "https://bestchromeextensions.com/2025/03/03/chrome-extension-vue3-complete-guide/"
---

# Build a Chrome Extension with Vue 3: Complete Tutorial for 2025

Vue 3 has become one of the most popular JavaScript frameworks for building modern web applications, and its reactive component model makes it perfect for creating Chrome extension user interfaces. Whether you are building a simple popup or a complex extension with multiple views, Vue 3 provides an excellent developer experience with the Composition API, TypeScript support, and a rich ecosystem of tools.

This comprehensive tutorial will walk you through building a production-ready Chrome extension with Vue 3 from scratch. We will cover project setup using modern tooling, building an interactive popup interface, managing state across extension components, and deploying your extension to the Chrome Web Store.

---

## Why Use Vue 3 for Chrome Extensions? {#why-vue-3}

Before diving into the code, let us explore why Vue 3 is an excellent choice for Chrome extension development in 2025.

### The Benefits of Vue 3 for Extensions

Vue 3 brings several advantages that make it particularly well-suited for Chrome extension development:

**Reactive Data Binding**: Vue 3's reactivity system makes it incredibly easy to build interactive UIs. When working with Chrome extension popup windows, you often need to display and update data based on browser state, user preferences, and messages from content scripts. Vue 3's reactive refs and computed properties handle this elegantly without the boilerplate code required by vanilla JavaScript.

**Component-Based Architecture**: Chrome extensions typically consist of several UI components—the popup, options page, and potentially side panels. Vue 3's component system allows you to build reusable UI elements that work consistently across all these views, reducing code duplication and maintenance overhead.

**Single File Components**: Vue's Single File Component (SFC) format combines template, script, and styles in one file, making it easy to understand and maintain your extension's UI code. This is particularly valuable when building extensions that may be worked on by multiple developers or revisited months later.

**Small Bundle Size**: Vue 3's tree-shaking capabilities result in remarkably small bundle sizes, which is crucial for Chrome extensions where performance and memory usage directly impact user experience. A minimal Vue 3 extension can be under 50KB gzipped.

### Vue 3 vs. React for Extensions

While React remains popular, Vue 3 offers several advantages for extension development:

- **Simpler Learning Curve**: Vue's template syntax is more approachable for developers familiar with HTML
- **Less Configuration**: Vue CLI and Vite require less setup than Create React App or manual webpack configuration
- **Better TypeScript Integration**: Vue 3's TypeScript support is first-class and requires less boilerplate
- **Scoped Styles**: Vue's scoped CSS by default prevents style leakage between components

---

## Setting Up Your Vue 3 Chrome Extension Project {#project-setup}

We will use Vite as our build tool because it provides lightning-fast hot module replacement during development and produces highly optimized production builds. The Vue.js team officially supports Vite, making it the recommended build tool for Vue 3 projects.

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org)
- **Google Chrome**: The latest stable version for testing
- **Code Editor**: Visual Studio Code with the Vue - Official extension

### Creating the Project

Open your terminal and create a new Vue 3 project using Vite:

```bash
npm create vite@latest vue3-chrome-extension -- --template vue-ts
cd vue3-chrome-extension
npm install
```

This creates a Vue 3 project with TypeScript support. Now we need to configure it for Chrome extension development.

### Installing Extension-Specific Dependencies

We need a few additional packages to build Chrome extensions with Vue 3:

```bash
npm install -D vite-plugin-chrome-extension typescript@~5.3.0
```

The `vite-plugin-chrome-extension` plugin handles the complex configuration needed to build extension-compatible output, including handling the manifest.json, service workers, and content scripts.

### Configuring Vite for Chrome Extension

Update your `vite.config.ts` to configure the extension build:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import chromeExtension from 'vite-plugin-chrome-extension'

export default defineConfig({
  plugins: [
    vue(),
    chromeExtension()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

### Creating the Manifest File

Chrome extensions require a `manifest.json` file in the root of your project. Create this file:

```json
{
  "manifest_version": 3,
  "name": "Vue 3 Todo Extension",
  "version": "1.0.0",
  "description": "A Chrome extension built with Vue 3 for managing todos",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

Notice that we set the popup to `index.html`, which Vite will generate from our Vue app. This is the key integration point between Vue and Chrome extensions.

### Adjusting the Vue Entry Point

Modify your `index.html` to work properly as an extension popup:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue Todo Extension</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

The key adjustment here is ensuring the viewport settings work well in the small popup window. Now let us build our Vue application.

---

## Building the Popup UI with Vue 3 {#popup-ui}

We will build a simple todo extension popup to demonstrate Vue 3's capabilities in a Chrome extension context. This will showcase reactive data binding, event handling, and component composition.

### Creating the Todo Component

Create a new component at `src/components/TodoList.vue`:

{% raw %}
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Todo {
  id: number
  text: string
  completed: boolean
}

const newTodo = ref('')
const todos = ref<Todo[]>([])

// Load todos from storage on mount
onMounted(async () => {
  const result = await chrome.storage.local.get('todos')
  todos.value = result.todos || []
})

// Add a new todo
const addTodo = async () => {
  if (!newTodo.value.trim()) return
  
  const todo: Todo = {
    id: Date.now(),
    text: newTodo.value.trim(),
    completed: false
  }
  
  todos.value.push(todo)
  newTodo.value = ''
  await saveTodos()
}

// Toggle todo completion
const toggleTodo = async (id: number) => {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    todo.completed = !todo.completed
    await saveTodos()
  }
}

// Delete a todo
const deleteTodo = async (id: number) => {
  todos.value = todos.value.filter(t => t.id !== id)
  await saveTodos()
}

// Save todos to chrome storage
const saveTodos = async () => {
  await chrome.storage.local.set({ todos: todos.value })
}

// Computed property for remaining count
const remainingCount = computed(() => 
  todos.value.filter(t => !t.completed).length
)
</script>

<template>
  <div class="todo-app">
    <h1>My Tasks</h1>
    
    <form @submit.prevent="addTodo" class="add-form">
      <input 
        v-model="newTodo" 
        type="text" 
        placeholder="Add a new task..."
        class="todo-input"
      />
      <button type="submit" class="add-btn">Add</button>
    </form>
    
    <ul class="todo-list">
      <li 
        v-for="todo in todos" 
        :key="todo.id"
        :class="{ completed: todo.completed }"
        class="todo-item"
      >
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            :checked="todo.completed"
            @change="toggleTodo(todo.id)"
          />
          <span class="todo-text">{{ todo.text }}</span>
        </label>
        <button 
          @click="deleteTodo(todo.id)" 
          class="delete-btn"
          aria-label="Delete task"
        >
          ×
        </button>
      </li>
    </ul>
    
    <div v-if="todos.length > 0" class="stats">
      {{ remainingCount }} {{ remainingCount === 1 ? 'task' : 'tasks' }} remaining
    </div>
    
    <div v-else class="empty-state">
      No tasks yet. Add one above!
    </div>
  </div>
</template>

<style scoped>
.todo-app {
  width: 320px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  font-size: 20px;
  color: #42b883;
  margin-bottom: 16px;
  text-align: center;
}

.add-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.todo-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.todo-input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.2);
}

.add-btn {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #359268;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: opacity 0.2s;
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.todo-text {
  font-size: 14px;
  color: #333;
}

.delete-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: #e53935;
}

.stats {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 12px;
}

.empty-state {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 20px;
}
</style>
```
{% endraw %}

### Updating the Main App Component

Modify `src/App.vue` to use our TodoList component:

```vue
<script setup lang="ts">
import TodoList from './components/TodoList.vue'
</script>

<template>
  <TodoList />
</template>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>
```

---

## State Management with Pinia in Chrome Extensions {#state-management}

For more complex extensions, you need a robust state management solution. Pinia, the official state management library for Vue 3, works exceptionally well in Chrome extensions.

### Installing Pinia

```bash
npm install pinia
```

### Setting Up Pinia in Your Extension

Create a Pinia store for managing extension-wide state:

```typescript
// src/stores/extensionStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExtensionStore = defineStore('extension', () => {
  // State
  const settings = ref({
    theme: 'light' as 'light' | 'dark',
    notifications: true,
    autoSave: true
  })
  
  const isLoading = ref(false)
  
  // Getters
  const isDarkMode = computed(() => settings.value.theme === 'dark')
  
  // Actions
  async function loadSettings() {
    isLoading.value = true
    try {
      const result = await chrome.storage.sync.get('settings')
      if (result.settings) {
        settings.value = { ...settings.value, ...result.settings }
      }
    } finally {
      isLoading.value = false
    }
  }
  
  async function updateSettings(newSettings: Partial<typeof settings.value>) {
    settings.value = { ...settings.value, ...newSettings }
    await chrome.storage.sync.set({ settings: settings.value })
  }
  
  return {
    settings,
    isLoading,
    isDarkMode,
    loadSettings,
    updateSettings
  }
})
```

### Using the Store in Components

{% raw %}
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useExtensionStore } from '../stores/extensionStore'

const store = useExtensionStore()

onMounted(() => {
  store.loadSettings()
})

const toggleTheme = () => {
  store.updateSettings({ 
    theme: store.isDarkMode ? 'light' : 'dark' 
  })
}
</script>

<template>
  <div :class="{ 'dark-mode': store.isDarkMode }">
    <button @click="toggleTheme">
      Switch to {{ store.isDarkMode ? 'Light' : 'Dark' }} Mode
    </button>
  </div>
</template>
```
{% endraw %}

---

## Service Worker Communication {#service-workers}

Chrome extensions use service workers (background scripts in Manifest V2) for handling events, managing state, and coordinating between different extension components. In Vue 3, we need to handle this communication carefully.

### Creating a Background Service Worker

Create `src/background.ts`:

```typescript
// src/background.ts

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)
  
  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.local.set({
      installed: true,
      installDate: Date.now()
    })
  }
})

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message)
  
  if (message.type === 'GET_DATA') {
    // Fetch data and respond
    chrome.storage.local.get('todos').then((result) => {
      sendResponse({ data: result.todos })
    })
    return true // Keep the message channel open for async response
  }
  
  if (message.type === 'PING') {
    sendResponse({ status: 'pong', timestamp: Date.now() })
  }
})

// Handle alarms for scheduled tasks
chrome.alarms.create('periodicTask', { periodInMinutes: 15 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    console.log('Periodic task executed')
    // Perform background tasks here
  }
})

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command triggered:', command)
})
```

### Communicating Between Popup and Service Worker

From your Vue popup, you can communicate with the service worker:

```typescript
// In your Vue component
const sendToBackground = async () => {
  const response = await chrome.runtime.sendMessage({ 
    type: 'GET_DATA' 
  })
  console.log('Background response:', response)
}
```

---

## Content Scripts with Vue {#content-scripts}

Content scripts run in the context of web pages and can modify page content. While they cannot directly use Vue components, you can use Vue for the logic and communicate results to the page.

### Creating a Content Script

```typescript
// src/contentScript.ts

// This runs in the context of web pages
const initContentScript = () => {
  // Find articles on the page
  const article = document.querySelector('article') || 
                 document.querySelector('[role="main"]') ||
                 document.querySelector('main')
  
  if (!article) return
  
  // Calculate reading time
  const text = article.innerText
  const wordCount = text.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)
  
  // Create a floating indicator
  const indicator = document.createElement('div')
  indicator.className = 'vue-extension-indicator'
  indicator.innerHTML = `
    <span>📖 ${readingTime} min read</span>
    <button class="save-btn">Save for later</button>
  `
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: #42b883;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
  `
  
  // Handle save button click
  indicator.querySelector('.save-btn')?.addEventListener('click', async () => {
    const result = await chrome.storage.local.get('savedArticles')
    const saved = result.savedArticles || []
    
    saved.push({
      url: window.location.href,
      title: document.title,
      readingTime,
      savedAt: Date.now()
    })
    
    await chrome.storage.local.set({ savedArticles: saved })
    alert('Article saved!')
  })
  
  document.body.appendChild(indicator)
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript)
} else {
  initContentScript()
}
```

---

## Building and Loading Your Extension {#building-loading}

Now that we have built our Vue 3 extension, let us compile it and load it into Chrome.

### Building the Extension

Run the Vite build command:

```bash
npm run build
```

This generates the production-ready extension in the `dist` folder. The `vite-plugin-chrome-extension` handles converting your Vue app into extension-compatible files.

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" button
4. Select the `dist` folder from your project
5. Your Vue 3 extension should now appear in the toolbar

### Development Mode

For faster development, you can use Vite's dev server with the extension plugin:

```bash
npm run dev
```

Then in Chrome extensions, use "Load unpacked" but point to your project root (the plugin handles the rest). Changes to your Vue components will hot-reload in the popup.

---

## Options Page and Multiple Views {#options-page}

Larger extensions often need an options page for user configuration. Vue 3 makes this easy.

### Creating an Options Page

Create `src/options/main.ts` for the options page entry point:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import OptionsApp from './OptionsApp.vue'

const app = createApp(OptionsApp)
app.use(createPinia())
app.mount('#app')
```

Create `index_options.html` in your project root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Extension Options</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/options/main.ts"></script>
  </body>
</html>
```

Update `vite.config.ts` to handle multiple entry points:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import chromeExtension from 'vite-plugin-chrome-extension'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    chromeExtension({
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'index_options.html')
      }
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

Update your `manifest.json` to include the options page:

```json
{
  "options_page": "options.html",
  "options_ui": {
    "page": "options.html",
    "open_in_tab": false
  }
}
```

---

## Performance Optimization {#performance}

Vue 3 extensions should be optimized for performance to ensure a snappy user experience.

### Lazy Loading Components

Use dynamic imports for components that are not immediately needed:

```typescript
const HeavyComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
)
```

### Code Splitting

Configure Vite to split code into smaller chunks:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'utils': ['./src/utils/helper.ts']
        }
      }
    }
  }
})
```

### Minimize Bundle Size

- Use PurgeCSS to remove unused styles
- Prefer native browser APIs over libraries
- Use `chrome.storage.local` wisely to avoid storing large objects

---

## Publishing to Chrome Web Store {#publishing}

Once your Vue 3 extension is ready, follow these steps to publish:

### Prepare for Submission

1. **Create icons**: Generate 16x16, 48x48, and 128x128 PNG icons
2. **Write description**: Craft a compelling description explaining your extension's value
3. **Take screenshots**: Create 1280x800 or 640x400 pixel screenshots
4. **Privacy policy**: Write a privacy policy if your extension handles user data

### Build for Production

```bash
npm run build
```

This creates the final extension files in the `dist` folder.

### Upload to Developer Dashboard

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Create a new item and upload your `dist` folder as a ZIP file
3. Fill in the store listing details
4. Submit for review

---

## Troubleshooting Common Issues {#troubleshooting}

Here are solutions to common problems you may encounter:

### Popup Not Loading

- Ensure your `manifest.json` points to the correct `index.html`
- Check the console in `chrome://extensions/` for errors
- Verify your Vite configuration outputs to the correct directory

### Hot Reload Not Working

- Make sure you are using the dev server, not just building
- Check that your extension is pointing to the development files
- Try disabling and re-enabling the extension

### State Not Persisting

- Verify you are using `chrome.storage` correctly
- Check that the service worker has not been terminated
- Ensure you are awaiting storage operations

---

## Conclusion {#conclusion}

Building Chrome extensions with Vue 3 in 2025 provides an excellent developer experience while producing performant, maintainable extensions. The combination of Vue 3's Composition API, TypeScript support, and Vite's fast builds makes extension development faster and more enjoyable than ever.

In this tutorial, we covered:

- Setting up a Vue 3 project with Vite for Chrome extension development
- Building an interactive popup interface with reactive components
- Managing state across extension components using Pinia
- Handling service worker communication
- Creating content scripts that integrate with web pages
- Building and publishing your extension to the Chrome Web Store

Vue 3's component-based architecture, small bundle sizes, and excellent TypeScript support make it an ideal choice for Chrome extension development. Whether you are building a simple popup or a complex extension with multiple views, Vue 3 provides the tools you need to create a polished user experience.

Start building your Vue 3 Chrome extension today, and take advantage of the powerful combination of Vue's reactive framework with Chrome's extension platform.


---

## Turn Your Extension Into a Business
Ready to monetize your Vue 3 Chrome extension? The [Extension Monetization Playbook](https://bestchromeextensions.com/resources/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*This guide is part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike — your comprehensive resource for Chrome extension development.*
