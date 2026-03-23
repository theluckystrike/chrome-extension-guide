---
layout: post
title: "Build Chrome Extensions with Vite: Fast Development Setup Guide 2025"
description: "Learn how to set up a blazing-fast Chrome extension development environment using Vite. This guide covers hot reload, Manifest V3 support, TypeScript integration, and production builds for 2025."
date: 2025-02-28
categories: [Chrome-Extensions, Build-Tools]
tags: [vite, chrome-extension, build-tools]
keywords: "chrome extension vite, vite chrome extension, fast chrome extension build, vite manifest v3, chrome extension hot reload vite"
canonical_url: "https://bestchromeextensions.com/2025/02/28/chrome-extension-vite-setup-guide/"
---

# Build Chrome Extensions with Vite: Fast Development Setup Guide 2025

If you have ever built a Chrome extension from scratch, you know the pain of manually refreshing your extension after every code change. The traditional development workflow involves editing your files, navigating to `chrome://extensions`, clicking the refresh button, and then testing your changes. This repetitive process slows down your development cycle and breaks your concentration. Fortunately, there is a better way in 2025.

Vite, the next-generation frontend build tool, has transformed how we develop web applications. Its lightning-fast hot module replacement (HMR), instant server start, and optimized production builds make it an ideal choice for Chrome extension development. you will learn how to set up a professional Chrome extension development environment using Vite, complete with hot reload, TypeScript support, Manifest V3 compliance, and automated production builds.

---

Why Use Vite for Chrome Extension Development? {#why-vite}

Before diving into the setup process, let us understand why Vite has become the go-to choice for modern Chrome extension development. Vite was originally created for Vue.js projects, but its framework-agnostic design makes it perfect for any JavaScript project, including browser extensions.

Blazing Fast Development Server

Vite leverages native ES modules in the browser to deliver near-instant server startup. Unlike traditional bundlers that scan your entire codebase before starting a development server, Vite serves your files over HTTP on-demand. When you request a file, Vite transforms it and sends it to the browser, resulting in startup times measured in milliseconds rather than seconds. For Chrome extension developers, this means you can start working on your extension immediately without waiting for a bloated build process to complete.

Hot Module Replacement That Works

Hot Module Replacement (HMR) is where Vite truly shines. When you modify a file, Vite does not rebuild your entire extension. Instead, it pushes the updated module to the browser via WebSocket, preserving your extension's state while instantly reflecting your changes. This creates a development experience where you see your UI updates in real-time without losing your test data or navigation state. For complex extensions with multiple popup views, options pages, and content scripts, this capability alone can cut your development time in half.

First-Class TypeScript Support

TypeScript has become essential for building maintainable Chrome extensions. Vite provides native TypeScript support out of the box, with no additional configuration required. Your extension code gets type-checked in real-time, catching errors before they reach production. Vite also performs TypeScript transpilation at build time, ensuring your extension works across all supported browsers without requiring a separate TypeScript setup.

Optimized Production Builds

When it comes time to publish your extension, Vite generates highly optimized production builds. It performs tree-shaking to remove unused code, minifies your assets, and splits your bundle into logical chunks that load on demand. The result is a smaller extension package that loads faster and uses less memory, which directly impacts your Chrome Web Store review time and user satisfaction ratings.

---

Setting Up Your Vite Chrome Extension Project {#project-setup}

Now that you understand the benefits, let us walk through the complete setup process. We will create a new Chrome extension project from scratch using Vite, configure it for Manifest V3, and set up hot reload for smooth development.

Step 1: Initialize Your Project

Create a new directory for your extension and initialize a Node.js project. Open your terminal and run the following commands:

```bash
mkdir my-chrome-extension
cd my-chrome-extension
npm init -y
```

Step 2: Install Required Dependencies

Install Vite and the Chrome extension-specific packages that make development smoother:

```bash
npm install vite typescript --save-dev
npm install chrome-extension-types --save-dev
```

The `chrome-extension-types` package provides TypeScript definitions for the Chrome extension API, giving you autocomplete and type checking for APIs like `chrome.runtime`, `chrome.storage`, and `chrome.tabs`.

Step 3: Create Your Project Structure

Organize your extension with a clean, scalable directory structure. Create the following folders and files:

```
my-chrome-extension/
 src/
    popup/
       popup.html
       popup.ts
       popup.css
    content/
       content.ts
    background/
       background.ts
    types/
        chrome.d.ts
 public/
    manifest.json
    icons/
 vite.config.ts
 tsconfig.json
 package.json
```

This structure separates your popup, content scripts, and background service worker into distinct modules, making your codebase easier to maintain as your extension grows.

Step 4: Configure Manifest V3

Create your `manifest.json` file in the `public` folder. This is the configuration file that tells Chrome about your extension's capabilities and permissions:

```json
{
  "manifest_version": 3,
  "name": "My Vite Chrome Extension",
  "version": "1.0.0",
  "description": "A Chrome extension built with Vite for blazing-fast development",
  "permissions": [
    "storage",
    "tabs"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"]
    }
  ]
}
```

Note that we are using Manifest V3, which became mandatory for all new extensions in 2023. Manifest V3 introduces several important changes, including service workers instead of background pages, promise-based APIs, and stricter content security policies.

Step 5: Configure Vite for Chrome Extensions

Create a `vite.config.ts` file in your project root. This configuration tells Vite how to build your extension files:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name]/[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

This configuration generates separate output files for each entry point, matching the structure that Chrome expects. The `resolve.alias` configuration makes your imports cleaner by allowing you to use `@` as a shortcut to your `src` directory.

Step 6: Set Up TypeScript

Create a `tsconfig.json` file to configure TypeScript for your project:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src//*"],
  "exclude": ["node_modules", "dist"]
}
```

The `noEmit: true` option is important because Vite handles the actual transpilation. TypeScript's role here is type checking only, which keeps your builds fast.

---

Implementing Hot Reload for Chrome Extensions {#hot-reload}

Hot reload is the killer feature that makes Vite-based extension development so productive. However, Chrome extensions require a special setup to enable true hot reload, because you cannot simply refresh a service worker or content script like you would a web page.

Setting Up Live Reload

The most reliable approach is to use the `vite-plugin-chrome-extension` package, which automatically handles the complexities of hot reloading for extensions. Install it with:

```bash
npm install vite-plugin-chrome-extension --save-dev
```

Update your `vite.config.ts` to use this plugin:

```typescript
import { defineConfig } from 'vite';
import chromeExtension from 'vite-plugin-chrome-extension';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    chromeExtension({
      extendManifestJson: './public/manifest.json',
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
    },
  },
});
```

With this plugin installed, you can run `npx vite build` to build your extension, or use a development server that watches for changes. The plugin also provides a convenient way to load your extension directly from the `dist` folder during development.

Manual Refresh Script

If you prefer not to use a plugin, you can create a simple script that automatically reloads your extension when files change. Create a file called `reload.js`:

```javascript
const fs = require('fs');
const { exec } = require('child_process');

const distDir = './dist';

fs.watch(distDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.js')) {
    console.log(`File changed: ${filename}`);
    exec('npx chrome-extension-reloader', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to reload extension:', error);
        return;
      }
      console.log('Extension reloaded successfully');
    });
  }
});
```

This approach requires the `chrome-extension-reloader` package, which communicates with Chrome to reload your extension whenever the build output changes.

---

Writing Your First Extension Code {#first-code}

Now that your development environment is set up, let us write some actual extension code to verify everything works. We will create a simple popup that displays a message and stores user preferences.

Creating the Popup

Update `src/popup/popup.html`:

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
  <div class="container">
    <h1>Welcome</h1>
    <p id="message">Loading...</p>
    <label>
      <input type="checkbox" id="enableFeature">
      Enable Feature
    </label>
    <button id="saveBtn">Save Settings</button>
  </div>
  <script type="module" src="popup.ts"></script>
</body>
</html>
```

Create `src/popup/popup.css`:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 16px;
  margin: 0;
  min-width: 300px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h1 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

button {
  background: #4285f4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #3367d6;
}
```

Create `src/popup/popup.ts`:

```typescript
// Get DOM elements
const messageEl = document.getElementById('message')!;
const enableFeatureEl = document.getElementById('enableFeature') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn')!;

// Load saved settings
async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get(['enabled', 'userName']);
  
  if (result.enabled) {
    enableFeatureEl.checked = true;
    messageEl.textContent = `Hello, ${result.userName || 'User'}!`;
  } else {
    messageEl.textContent = 'Feature is disabled';
  }
}

// Save settings
async function saveSettings(): Promise<void> {
  const enabled = enableFeatureEl.checked;
  const userName = 'Developer';
  
  await chrome.storage.local.set({ enabled, userName });
  messageEl.textContent = enabled 
    ? `Hello, ${userName}! Settings saved.` 
    : 'Feature is disabled. Settings saved.';
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);

// Initialize
loadSettings();
```

This popup demonstrates the core concepts of Chrome extension development: accessing the Chrome storage API, handling user interactions, and updating the UI based on saved preferences.

Creating the Background Service Worker

Create `src/background/background.ts`. In Manifest V3, background pages are replaced with service workers:

```typescript
// Background service worker for Manifest V3

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    enabled: false,
    userName: 'User',
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled });
    });
    return true; // Keep channel open for async response
  }
});
```

Creating a Content Script

Content scripts run in the context of web pages. Create `src/content/content.ts`:

```typescript
// Content script - runs on web pages

console.log('Content script loaded');

// Example: Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    // Add highlighting logic here
    document.body.style.backgroundColor = '#fffbe6';
    sendResponse({ success: true });
  }
});
```

---

Building and Testing Your Extension {#build-test}

With your code in place, it is time to build and test your extension.

Development Build

Run the development build to generate your extension files:

```bash
npm run build
```

This command uses Vite to compile your TypeScript files, bundle dependencies, and output the final files to the `dist` directory. You should see output indicating successful compilation.

Loading the Extension in Chrome

To load your extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your `dist` folder
4. Pin your extension to the toolbar to test the popup

You should see your popup appear when you click the extension icon. Try checking the "Enable Feature" checkbox and clicking "Save Settings" to verify that the storage API is working correctly.

Production Build

When you are ready to publish, create a production build with additional optimizations:

```bash
npx vite build --mode production
```

The production build will generate smaller, minified files with all debugging information removed. You can then package your extension using the Chrome Web Store developer dashboard.

---

Best Practices for Vite Chrome Extension Development {#best-practices}

As you continue building Chrome extensions with Vite, keep these best practices in mind to maintain a clean, performant codebase.

Separate Concerns

Keep your popup, background service worker, and content scripts in separate modules. This separation makes your code easier to test, debug, and maintain. Use TypeScript interfaces to define the shape of messages passed between these components.

Use Environment Variables

Vite supports environment variables out of the box. Create a `.env` file for development and production settings:

```
VITE_API_URL=https://api.example.com
VITE_DEBUG=true
```

Access these variables in your code using `import.meta.env.VITE_API_URL`. Never commit sensitive API keys to your repository.

Optimize Your Bundle Size

Chrome has a strict 200MB package size limit. Use Vite's code splitting features to keep your initial bundle small:

```typescript
// Lazy load a heavy module
const heavyModule = await import('./heavyModule');
```

Only include the code that your extension actually needs. Review the build output regularly to identify large dependencies that you might be able to replace with smaller alternatives.

Handle Errors Gracefully

Always wrap Chrome API calls in try-catch blocks, as APIs can fail due to user permissions or extension context invalidation:

```typescript
try {
  await chrome.storage.local.set({ key: 'value' });
} catch (error) {
  console.error('Failed to save to storage:', error);
}
```

---

Conclusion {#conclusion}

Building Chrome extensions with Vite transforms your development experience from a tedious cycle of manual refreshes to a streamlined workflow with instant feedback. The hot module replacement, TypeScript support, and optimized production builds make Vite the ideal choice for modern extension development.

you have learned how to set up a complete development environment, configure Manifest V3, implement hot reload, and write your first extension code. You now have all the tools you need to create professional Chrome extensions that are fast to build, easy to maintain, and a joy to use.

The Chrome extension ecosystem continues to evolve, and Vite evolves with it. By adopting Vite for your extension development, you are future-proofing your projects and setting yourself up for success in 2025 and beyond. Start building your next Chrome extension with Vite today, and experience the difference that modern tooling can make.

---

Frequently Asked Questions {#faq}

Q: Does Vite work with Manifest V2 extensions?
A: While Vite can technically build Manifest V2 extensions, Google no longer accepts new Manifest V2 extensions in the Chrome Web Store. All new extensions must use Manifest V3. If you are maintaining a legacy Manifest V2 extension, consider migrating to Manifest V3 using Vite's build system.

Q: Can I use React or Vue with my Vite Chrome extension?
A: Absolutely! Vite has official plugins for React, Vue, Svelte, and other frameworks. Simply add your framework's Vite plugin to the configuration, and you can use your preferred UI library for your popup and options pages.

Q: How do I handle Chrome extension permissions with Vite?
A: Permissions are defined in your `manifest.json` file, not in your Vite configuration. When you need new permissions, update the manifest and rebuild. Remember that broad permissions may trigger additional review processes in the Chrome Web Store.

Q: Why is my service worker not hot reloading?
A: Service workers have different reload behavior than regular web pages. When you modify your background script, you need to manually reload the extension in `chrome://extensions` or use a reload plugin. The `vite-plugin-chrome-extension` handles much of this automatically.

Q: Can I use ES modules in my Chrome extension?
A: Yes, Vite handles ES module compilation automatically. However, remember that content scripts run in an isolated world and cannot share ES modules with the page. Background service workers and popup pages can use ES modules freely.
