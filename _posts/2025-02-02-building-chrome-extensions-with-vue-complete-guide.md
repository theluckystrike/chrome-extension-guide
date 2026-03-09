---
layout: default
title: "Building Chrome Extensions with Vue.js — Complete Developer Guide (2025)"
description: "Build Chrome extensions with Vue 3 and the Composition API. Covers popup UI, content scripts, Pinia state management, and production builds for the Chrome Web Store."
date: 2025-02-02
categories: [tutorials, frameworks]
tags: [vue, vue3, chrome-extension, vue-chrome-extension, composition-api]
author: theluckystrike
---

# Building Chrome Extensions with Vue.js — Complete Developer Guide (2025)

Vue.js has become one of the most popular choices for building Chrome extensions in 2025. Its reactive data binding, Composition API, and seamless integration with modern build tools make it an excellent framework for extension development. Whether you are building a simple popup tool or a complex extension with content scripts, background workers, and options pages, Vue 3 provides the flexibility and performance you need.

This guide walks you through building Chrome extensions with Vue 3 from project setup to production deployment. We cover the modern development workflow using Vite and CRXJS, dive into the Composition API for popup development, explore content script mounting patterns, and discuss state management with Pinia. By the end, you will have the knowledge to build production-ready Chrome extensions with Vue.

---

## Why Use Vue 3 for Chrome Extensions? {#why-vue-3}

Vue 3 brings several advantages that make it particularly well-suited for Chrome extension development. The Composition API, introduced in Vue 3, provides a flexible way to organize logic across your extension's different components. You can extract reusable behavior into composables, making your code more maintainable and testable.

The framework's small bundle size is crucial for Chrome extensions, where every kilobyet affects load time and user experience. Vue 3's tree-shaking capabilities ensure that only the code you use ends up in your final build. This is particularly important for extension popups, which need to open quickly when users click the extension icon.

Vue's reactive system integrates naturally with Chrome's storage APIs, allowing you to create seamless data synchronization between your extension's components. Whether you are persisting user preferences, caching data from external APIs, or sharing state between popup and content scripts, Vue's reactivity makes the process intuitive.

---

## Project Setup: Vite + Vue 3 + CRXJS {#vite-crxjs-setup}

The modern Vue 3 extension development workflow centers around Vite for fast development and building, combined with CRXJS for packaging Chrome extensions. This combination provides hot module replacement during development and produces optimized builds ready for the Chrome Web Store.

### Creating Your Project

Start by creating a new Vue project with Vite:

```bash
npm create vite@latest my-extension -- --template vue
cd my-extension
npm install
```

Next, install CRXJS as a development dependency to enable Chrome extension building:

```bash
npm install -D @crxjs/plugin-vite
```

### Configuring Vite for Chrome Extension

Create or update your `vite.config.js` to incorporate the CRXJS plugin:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/plugin-vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

Your `manifest.json` defines the extension structure. For a Vue-based extension, it typically looks like this:

```json
{
  "manifest_version": 3,
  "name": "My Vue Extension",
  "version": "1.0.0",
  "description": "A Chrome extension built with Vue 3",
  "action": {
    "default_popup": "index.html",
    "default_icon": "icons/icon48.png"
  },
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The CRXJS plugin automatically handles the complexity of building multiple entry points for popup, background worker, and content scripts. During development, run `npm run dev` and load your extension from the `dist` folder using Chrome's developer mode.

---

## Building the Popup with Composition API {#popup-composition-api}

The popup is the most visible part of your extension, and Vue 3's Composition API makes building reactive popup interfaces straightforward. The Composition API allows you to group related logic together, making your popup code easier to maintain as it grows.

### Basic Popup Structure

Your main `App.vue` for the popup might look like this:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useExtensionStorage } from '@/composables/useExtensionStorage'

const { load, save, data } = useExtensionStorage('settings')
const isLoading = ref(true)
const message = ref('')

onMounted(async () => {
  await load()
  isLoading.value = false
})

const handleSave = async () => {
  await save()
  message.value = 'Settings saved!'
  setTimeout(() => message.value = '', 2000)
}
</script>

<template>
  <div class="popup">
    <h2>Extension Settings</h2>
    <div v-if="isLoading">Loading...</div>
    <div v-else>
      <label>
        <input v-model="data.enabled" type="checkbox">
        Enable Extension
      </label>
      <button @click="handleSave">Save</button>
      <p v-if="message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.popup {
  width: 320px;
  padding: 16px;
}
</style>
```

### Leveraging Composables for Reusable Logic

The Composition API truly shines when you create custom composables. Instead of repeating storage logic across your popup, options page, and background scripts, you extract it into reusable functions. This pattern keeps your code DRY and makes testing individual pieces easier.

For example, a composable for Chrome storage might handle loading, saving, and subscribing to changes:

```javascript
import { ref, watch } from 'vue'

export function useExtensionStorage(key, defaultValue = {}) {
  const data = ref(defaultValue)
  const isLoaded = ref(false)

  const load = async () => {
    const result = await chrome.storage.local.get(key)
    data.value = result[key] ?? defaultValue
    isLoaded.value = true
  }

  const save = async () => {
    await chrome.storage.local.set({ [key]: data.value })
  }

  // Listen for changes from other extension contexts
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[key]) {
      data.value = changes[key].newValue
    }
  })

  return { data, load, save, isLoaded }
}
```

This composable can be used identically in your popup, options page, or any other Vue component that needs to interact with Chrome storage.

---

## Content Script Vue Mounting {#content-script-mounting}

Content scripts run in the context of web pages, not the extension's popup. While they share the extension's JavaScript runtime, they cannot directly access the DOM of your popup or options page. Vue can still power your content scripts, but the mounting pattern differs slightly from typical SPA development.

### Mounting Vue to Page Elements

The key difference is that content scripts mount Vue to specific elements already present in the page, rather than controlling the entire page. This approach lets you enhance existing websites with Vue-powered features:

```javascript
// content.js
import { createApp } from 'vue'
import ContentWidget from './ContentWidget.vue'

// Find or create a container element in the page
let container = document.getElementById('vue-extension-container')
if (!container) {
  container = document.createElement('div')
  container.id = 'vue-extension-container'
  document.body.appendChild(container)
}

// Mount your Vue app to the container
const app = createApp(ContentWidget)
app.mount(container)
```

Your Vue component then operates within that isolated container:

```vue
<!-- ContentWidget.vue -->
<script setup>
import { ref } from 'vue'

const isExpanded = ref(false)
const pageData = ref({})

const extractPageData = () => {
  // Interact with the page through standard DOM APIs
  pageData.value = {
    title: document.title,
    url: window.location.href,
    links: document.querySelectorAll('a').length
  }
  isExpanded.value = true
}
</script>

<template>
  <div class="extension-widget">
    <button @click="extractPageData" class="widget-toggle">
      Analyze Page
    </button>
    <div v-if="isExpanded" class="widget-panel">
      <h3>Page Analysis</h3>
      <p>Title: {{ pageData.title }}</p>
      <p>Links: {{ pageData.links }}</p>
    </div>
  </div>
</template>

<style scoped>
.extension-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
}
</style>
```

### Shadow DOM for Style Isolation

Content script styles can leak into the page and page styles can affect your Vue components. Using the Shadow DOM provides complete style isolation:

```javascript
import { createApp } from 'vue'

const mountPoint = document.createElement('div')
mountPoint.id = 'vue-extension-root'
document.body.appendChild(mountPoint)

const shadow = mountPoint.attachShadow({ mode: 'open' })
const style = document.createElement('style')
style.textContent = `/* Your component styles */`
shadow.appendChild(style)

const app = createApp(ContentWidget)
app.mount(shadow)
```

This approach ensures your content script styling never conflicts with page styles, regardless of how complex the host page's CSS might be.

---

## Options Page with Vue Router {#options-page-vue-router}

Complex extensions often benefit from a multi-page options or settings interface. Vue Router handles navigation between different settings sections, providing a familiar SPA experience within the extension context.

### Setting Up Vue Router

Configure Vue Router for your options page:

```javascript
// router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import GeneralSettings from '../views/GeneralSettings.vue'
import AdvancedSettings from '../views/AdvancedSettings.vue'
import About from '../views/About.vue'

const routes = [
  { path: '/', name: 'general', component: GeneralSettings },
  { path: '/advanced', name: 'advanced', component: AdvancedSettings },
  { path: '/about', name: 'about', component: About }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

### Integrating Router in Options Page

Your options page entry point connects Vue Router:

```vue
<!-- options/index.html or main options component -->
<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="options-container">
    <nav class="options-nav">
      <RouterLink to="/">General</RouterLink>
      <RouterLink to="/advanced">Advanced</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
    <main class="options-content">
      <RouterView />
    </main>
  </div>
</template>
```

The options page is defined in your `manifest.json` under `options_page`:

```json
{
  "options_page": "options.html"
}
```

CRXJS automatically generates both `index.html` for the popup and `options.html` for the options page based on your Vite configuration.

---

## State Management with Pinia {#pinia-state-management}

For larger extensions with complex state requirements, Pinia provides a powerful state management solution. Pinia stores can hold extension-wide state accessible from popup, options page, background scripts, and content scripts through Chrome's message passing or storage synchronization.

### Creating a Pinia Store

```javascript
// stores/extensionStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExtensionStore = defineStore('extension', () => {
  // State
  const userPreferences = ref({
    theme: 'light',
    notifications: true,
    autoSave: false
  })
  const cachedData = ref({})
  const isLoading = ref(false)

  // Computed
  const isDarkMode = computed(() => userPreferences.value.theme === 'dark')
  const hasCachedData = computed(() => Object.keys(cachedData.value).length > 0)

  // Actions
  async function loadPreferences() {
    isLoading.value = true
    const result = await chrome.storage.local.get('preferences')
    if (result.preferences) {
      userPreferences.value = result.preferences
    }
    isLoading.value = false
  }

  async function savePreferences() {
    await chrome.storage.local.set({
      preferences: userPreferences.value
    })
  }

  function updateTheme(theme) {
    userPreferences.value.theme = theme
    savePreferences()
  }

  return {
    userPreferences,
    cachedData,
    isLoading,
    isDarkMode,
    hasCachedData,
    loadPreferences,
    savePreferences,
    updateTheme
  }
})
```

### Using the Store Across Components

In your popup or options page:

```vue
<script setup>
import { onMounted } from 'vue'
import { useExtensionStore } from '@/stores/extensionStore'

const store = useExtensionStore()

onMounted(() => {
  store.loadPreferences()
})

const toggleTheme = () => {
  const newTheme = store.userPreferences.theme === 'light' ? 'dark' : 'light'
  store.updateTheme(newTheme)
}
</script>

<template>
  <div :class="{ dark: store.isDarkMode }">
    <button @click="toggleTheme">
      Switch to {{ store.userPreferences.theme === 'light' ? 'Dark' : 'Light' }} Mode
    </button>
  </div>
</template>
```

---

## Chrome Storage Composables {#chrome-storage-composables}

While the basic storage composable we covered earlier handles simple use cases, real extensions often need more sophisticated storage patterns. Creating specialized composables for different storage needs keeps your code organized.

### Async Storage with Retry Logic

```javascript
// composables/useRobustStorage.js
import { ref } from 'vue'

export function useRobustStorage() {
  const isLoading = ref(false)
  const error = ref(null)

  const get = async (keys, retries = 3) => {
    isLoading.value = true
    error.value = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await chrome.storage.local.get(keys)
        isLoading.value = false
        return result
      } catch (e) {
        if (attempt === retries) {
          error.value = e.message
          isLoading.value = false
          throw e
        }
        await new Promise(r => setTimeout(r, 100 * attempt))
      }
    }
  }

  const set = async (items, retries = 3) => {
    isLoading.value = true
    error.value = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await chrome.storage.local.set(items)
        isLoading.value = false
        return true
      } catch (e) {
        if (attempt === retries) {
          error.value = e.message
          isLoading.value = false
          throw e
        }
        await new Promise(r => setTimeout(r, 100 * attempt))
      }
    }
  }

  return { get, set, isLoading, error }
}
```

### Sync Storage for Settings

For settings that need to sync across devices through the user's Google account:

```javascript
// composables/useSyncStorage.js
import { ref, watch } from 'vue'

export function useSyncStorage(key, defaultValue) {
  const data = ref(defaultValue)
  const isLoaded = ref(false)

  const load = async () => {
    const result = await chrome.storage.sync.get(key)
    data.value = result[key] ?? defaultValue
    isLoaded.value = true
  }

  const save = async () => {
    await chrome.storage.sync.set({ [key]: data.value })
  }

  // Watch for changes from other devices
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[key]) {
      data.value = changes[key].newValue
    }
  })

  return { data, load, save, isLoaded }
}
```

---

## Vue DevTools in Extension Context {#vue-devtools-extension}

Debugging Vue applications inside Chrome extensions requires some special consideration. The extension context differs from regular web pages, which affects how Vue DevTools works.

### Enabling Vue DevTools

Install Vue DevTools in your extension during development:

```bash
npm install -D @vue/devtools
```

Configure Vite to include DevTools in development builds:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/plugin-vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    vue({
      devtools: true
    }),
    crx({ manifest })
  ],
  build: {
    rollupOptions({
      output: {
        manualChunks: undefined
      }
    })
  }
})
```

### Debugging Popup and Options Pages

Popup and options pages can be inspected like regular web pages. Right-click the extension popup and select "Inspect" to open DevTools. Vue DevTools will be available in the DevTools panel, allowing you to inspect components, props, and reactive state.

Content scripts present more of a challenge since they run in the context of web pages. The Vue DevTools extension can connect to your content script if the page allows it, but you may find that adding console logging or using the background script for debugging is more reliable for content script issues.

---

## Build Optimization for Production {#build-optimization}

Production builds for Chrome extensions require careful optimization to ensure fast load times and small bundle sizes. Vite and the CRXJS plugin provide good defaults, but there are additional optimizations you should consider.

### Code Splitting

Configure code splitting to separate vendor code from your application code:

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
        }
      }
    }
  }
})
```

This creates separate chunks that can be cached independently. When you update your application code but not Vue itself, users do not need to re-download the vendor chunk.

### Tree Shaking Unused Code

Ensure you are importing only what you need:

```javascript
// Good: imports only what you use
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'

// Avoid: importing everything
import * as Vue from 'vue'  // This prevents tree shaking
```

### Asset Optimization

Compress images and other assets:

```javascript
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    viteCompression()
  ],
  build: {
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    cssCodeSplit: true
  }
})
```

### Manifest Configuration for Performance

In your `manifest.json`, declare only the permissions your extension actually needs. Unnecessary permissions slow down the installation process and may trigger warnings for users:

```json
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ]
}
```

Use activeTab permission instead of host permissions when possible, as it is less intrusive and does not require broad access to all URLs.

---

## Comparing Vue with React for Chrome Extensions {#vue-vs-react}

The choice between Vue and React for Chrome extension development often comes down to team preference and existing codebase. However, there are some practical differences worth considering.

### Bundle Size

Vue's runtime is slightly smaller than React's, which can be significant for extension popups where every kilobyte affects perceived performance. A minimal Vue 3 application typically ships around 30-40KB gzipped, while React with ReactDOM is closer to 40-50KB.

### Learning Curve

Vue's single-file components combine template, script, and style in one file, which some developers find more intuitive than React's pattern of separating JSX, CSS-in-JS, and props. For teams new to frontend frameworks, Vue's gentler learning curve can mean faster onboarding.

### Ecosystem and Libraries

React's ecosystem is larger, with more third-party libraries available. However, Vue's ecosystem is mature enough that most extension use cases are well-covered. Libraries like VueUse provide composables that mirror many React hooks patterns.

### Integration with Chrome APIs

Both frameworks integrate equally well with Chrome's extension APIs. The difference is purely syntactic. Vue's Composition API and React's hooks serve similar purposes, and both work well with chrome.storage, chrome.runtime, and other extension APIs.

Ultimately, choose the framework your team is most comfortable with. The [chrome-extension-vue-starter](https://github.com/theluckystrike/chrome-extension-vue-starter) provides a complete Vue 3 starting point, while the [chrome-extension-guide](https://github.com/theluckystrike/chrome-extension-guide) documentation covers general extension patterns applicable to any framework.

---

## Conclusion {#conclusion}

Building Chrome extensions with Vue 3 combines the best of modern frontend development with the unique requirements of browser extensions. The Composition API provides excellent code organization, Pinia handles state management elegantly, and Vite with CRXJS delivers a smooth development workflow.

The patterns covered in this guide—from popup development with composables to content script mounting with Shadow DOM—provide a foundation for building sophisticated extensions. Remember to optimize your builds for production, keep your bundle size small, and only request the permissions you truly need.

For more guidance on extension development patterns and best practices, explore the [chrome-extension-guide docs](/chrome-extension-guide/docs/). When you are ready to monetize your extension, the [extension-monetization-playbook](/chrome-extension-guide/docs/extension-monetization-playbook/) provides strategies for building a sustainable extension business.

---

**Related Resources:**

- [chrome-extension-vue-starter](https://github.com/theluckystrike/chrome-extension-vue-starter) — Production-ready Vue 3 extension template
- [Chrome Extension Development Guide](/chrome-extension-guide/) — Comprehensive documentation
- [Extension Monetization Playbook](/chrome-extension-guide/docs/extension-monetization-playbook/) — Monetization strategies

---

*Built by [theluckystrike](https://github.com/theluckystrike) at [zovo.one](https://zovo.one)*
