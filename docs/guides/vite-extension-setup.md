---
layout: default
title: "Chrome Extension Vite Setup. Developer Guide"
description: "Set up your Chrome extension project with this configuration guide covering tools, frameworks, and best practices for development."
canonical_url: "https://bestchromeextensions.com/guides/vite-extension-setup/"
---
Vite Setup for Chrome Extensions

Overview {#overview}

Vite is a modern build tool that provides an incredibly fast development experience for Chrome extensions. Originally designed for web applications, Vite's architecture makes it particularly well-suited for extension development, offering lightning-fast Hot Module Replacement (HMR) for popup and options pages, native TypeScript and JSX support, and efficient production builds through Rollup.

This guide covers setting up Vite as your build tool, configuring multi-entry builds for different extension contexts (background service worker, content scripts, popup, and options page), and establishing a productive development workflow.

Why Vite {#why-vite}

Vite offers several compelling advantages for Chrome extension development. First, its development server starts instantly by serving files over native ES modules rather than bundling everything upfront. This means you get near-instant server startup even for larger extension projects. The Hot Module Replacement system is extraordinarily fast, changes to your popup or options React/Vue/Svelte components update in the browser typically within 10-50 milliseconds, making for a remarkably smooth development experience.

Vite includes built-in support for TypeScript, JSX, and CSS modules without requiring additional configuration. You can write your extension in TypeScript and have it transpiled automatically, or use React JSX syntax in your popup components out of the box. The production build uses Rollup under the hood, which produces highly optimized, minified bundles that are smaller than many alternatives.

Additionally, Vite's configuration system is straightforward and JavaScript-focused, making it accessible to developers who may be less familiar with webpack's more complex configuration DSL.

Project Structure {#project-structure}

A typical Chrome extension project built with Vite follows a structured directory layout that separates different extension contexts:

```
src/
  background/
    service-worker.ts      # Background service worker entry
  content/
    content-script.ts     # Content script entry
  popup/
    popup.html            # Popup HTML entry
    popup.tsx             # Popup React/Vue component
    popup.css             # Popup styles
  options/
    options.html          # Options page HTML entry
    options.tsx           # Options React/Vue component
    options.css           # Options styles
  shared/
    types.ts              # Shared TypeScript types
    utils.ts              # Shared utility functions
  styles/
    global.css            # Global styles
manifest.json             # Extension manifest
vite.config.ts            # Vite configuration
package.json              # Dependencies and scripts
tsconfig.json             # TypeScript configuration
```

This structure keeps each extension context isolated while allowing shared code to be imported where needed. The manifest.json typically stays in the project root and gets copied to the dist folder during the build process.

vite.config.ts {#viteconfigts}

The Vite configuration for a Chrome extension requires setting up multiple entry points, each corresponding to a different extension context. Here is a comprehensive configuration:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

This configuration defines four entry points: popup, options, background, and content. Each entry produces a corresponding JavaScript file in the dist directory. The resolve aliases provide convenient imports for shared code.

Service Worker Build {#service-worker-build}

The background service worker presents unique challenges because it runs in a special Chrome context without access to the DOM. Unlike popup and options pages, the service worker cannot use HMR, each change requires reloading the extension in Chrome. Additionally, the service worker must be a single bundled file with no dynamic imports, as Chrome loads it as a single script.

Configure the service worker as a library entry to ensure all dependencies are bundled into a single file:

```ts
// vite.config.ts additions for service worker
rollupOptions: {
  input: {
    background: resolve(__dirname, 'src/background/service-worker.ts'),
  },
  output: {
    entryFileNames: 'background.js', // Fixed name for manifest reference
    format: 'iife', // Immediately Invoked Function Expression
    inlineDynamicImports: true, // Force single bundle
  },
}
```

The inlineDynamicImports option ensures all code is bundled into one file, which is required for service workers. Some developers prefer to create a separate build configuration specifically for the service worker to have more granular control over the output.

Content Script Build {#content-script-build}

Content scripts are injected into web pages and must be completely self-contained since they run in the context of arbitrary websites. They cannot rely on any external dependencies being present, and Chrome requires them to be specified as single files in the manifest.

Configure content script builds to output a single file without code splitting:

```ts
rollupOptions: {
  input: {
    content: resolve(__dirname, 'src/content/content-script.ts'),
  },
  output: {
    entryFileNames: 'content.js',
    format: 'iife',
    inlineDynamicImports: true,
  },
}
```

If your content script requires CSS, you have two options: extract CSS into a separate file and include it in the manifest's css array, or inject styles programmatically using JavaScript. The programmatic approach keeps everything in one file but requires more setup:

```ts
import styles from './content.css?inline';
// In your content script
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);
```

Popup and Options with Frameworks {#popup-and-options-with-frameworks}

Vite works smoothly with React, Vue, Svelte, and other frameworks for your popup and options pages. The HMR system works naturally, allowing you to develop your UI without constantly reloading the extension.

For React popup development, create your popup component as usual:

```tsx
// src/popup/popup.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import './popup.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
```

The corresponding HTML file needs a root element:

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Extension Popup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./popup.tsx"></script>
  </body>
</html>
```

Vue and Svelte work similarly, with Vite handling the compilation automatically. Each framework's development server will reload your changes instantly.

Development Workflow {#development-workflow}

The typical development workflow with Vite and Chrome extensions involves a few key steps. First, start the development build with watch mode:

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite build --watch",
    "dev:server": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

The `vite build --watch` command continuously rebuilds your extension as you make changes. After each build, load or reload your unpacked extension from the dist directory in Chrome:

1. Navigate to `chrome://extensions`
2. Enable Developer mode (toggle in top right)
3. Click "Load unpacked" and select your dist directory
4. After making changes, click the reload icon on your extension card

For a more streamlined experience, consider using the Chrome Extension Reload plugin for VS Code, which automatically reloads the extension when files change. Alternatively, the CRXJS Vite Plugin provides built-in auto-reload functionality.

Vite Plugins for Extensions {#vite-plugins-for-extensions}

Several Vite plugins simplify Chrome extension development. The most popular options include:

vite-plugin-web-extension automatically handles manifest generation, multi-entry builds, and provides HMR support. It can read your manifest.json and automatically create the correct build entries, reducing configuration complexity.

CRXJS Vite Plugin offers the most complete development experience, with automatic extension reloading, manifest handling, and preview functionality built-in. It is specifically designed for Chrome extension development and handles many edge cases automatically.

Manual Configuration provides the most control but requires more setup. You define all entry points explicitly and handle manifest copying yourself. This approach is preferred by developers who want to understand exactly how their build works or need custom processing that plugins don't support.

For most projects, starting with CRXJS is recommended as it provides the best balance of convenience and functionality.

Production Build {#production-build}

The production build process creates optimized files ready for distribution. A complete build script might look like:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "zip": "zip -r extension.zip dist/",
    "release": "npm run build && npm run zip"
  }
}
```

The build process performs several operations: TypeScript compilation with type checking, Vite production builds with minification and tree-shaking, and copying static assets including the manifest.json to the dist directory.

Create a simple script to copy the manifest:

```ts
// scripts/copy-manifest.ts
import { promises as fs } from 'fs';
import { resolve } from 'path';

async function copyManifest() {
  const manifest = JSON.parse(
    await fs.readFile('./manifest.json', 'utf-8')
  );
  
  // Update manifest paths if needed for production
  await fs.writeFile(
    './dist/manifest.json',
    JSON.stringify(manifest, null, 2)
  );
}

copyManifest();
```

After building, you can upload the resulting zip file to the Chrome Web Store using the developer dashboard or the chrome-webstore-upload tool.

Code Examples {#code-examples}

Complete vite.config.ts for Extension {#complete-viteconfigts-for-extension}

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background and content as single files
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'pages/[name].js';
        },
      },
    },
  },
});
```

Package.json Scripts {#packagejson-scripts}

```json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc --noEmit && vite build --mode production",
    "preview": "vite preview",
    "zip": "zip -r extension.zip dist/",
    "release": "npm run build && npm run zip"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.244",
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

TypeScript Service Worker Entry {#typescript-service-worker-entry}

```ts
// src/background/service-worker.ts
/// <reference types="chrome-types/background" />

import { handleMessage } from '../shared/message-handler';
import { initializeStorage } from '../shared/storage';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  initializeStorage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});
```

Cross-References {#cross-references}

For more information on related topics, see these guides:

- [TypeScript Extensions](./typescript-extensions.md) - TypeScript configuration and type definitions for Chrome APIs
- [CI/CD Pipeline](./ci-cd-pipeline.md) - Automated testing and deployment workflows
- [Architecture Patterns](./architecture-patterns.md) - Design patterns for scalable extension architecture

Related Articles {#related-articles}

Related Articles

- [Esbuild Setup](../guides/esbuild-extension-setup.md)
- [Rollup Setup](../guides/rollup-extension-setup.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
